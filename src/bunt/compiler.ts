import { parse } from "./parser";
import type {
  AST,
  CompileResult,
  AccessorNode,
  TextNode,
  IfNode,
  EachNode,
  PartialNode,
  InterpolationNode,
  RenderOptions,
  Helpers,
} from "./types";
import { ok, err } from "neverthrow";
import { match } from "ts-pattern";
import { standardHelpers } from "./helpers";
import { CodeBuilder } from "./codeBuilder";

/**
 * Compile a template string into a TypeScript render function.
 *
 * @param src         The raw template source.
 * @param templateId  Identifier used in generated type/function names.
 * @param options     Compilation options, including custom helpers.
 */
export function compile(
  src: string,
  templateId: string = "Template",
  options: RenderOptions = {}
): CompileResult {
  const parsed = parse(src);
  if (parsed.isErr()) {
    return err({
      message: parsed.error.message,
      position: parsed.error.position,
    });
  }

  const compiler = new Compiler(
    templateId,
    parsed.value,
    options.helpers ?? {},
    options.target ?? "module"
  );
  return compiler.compile();
}

class Compiler {
  private readonly templateId: string;
  private readonly ast: AST;
  private readonly allHelpers: Helpers;
  private readonly target: "module" | "jit";

  constructor(
    templateId: string,
    ast: AST,
    customHelpers: Helpers,
    target: "module" | "jit"
  ) {
    this.templateId = templateId;
    this.ast = ast;
    this.allHelpers = { ...standardHelpers, ...customHelpers };
    this.target = target;
  }

  public compile(): CompileResult {
    const body = this.compileAst(this.ast, []);
    const fnName = `render_${this.templateId.replace(/[^\w]/g, "_")}`;

    if (this.target === "jit") {
      const source = [
        `return async function ${fnName}(ctx, options = {}) {`,
        "  const helpers = { ...standardHelpers, ...options.helpers };",
        `  return ${body};`,
        "}",
      ].join("\n");
      return ok({ source, fnName });
    }

    const source = [
      'import { standardHelpers } from "./helpers";',
      'import { render } from "./runtime";',
      'import type { Ctx, RenderOptions } from "./types";',
      `export default async function ${fnName}(ctx: Ctx, options: RenderOptions = {}): Promise<string> {`,
      "  const helpers = { ...standardHelpers, ...options.helpers };",
      `  return ${body};`,
      "}",
      "",
    ].join("\n");
    return ok({ source, fnName });
  }

  private compileAst(ast: AST, scope: string[]): string {
    let builder = new CodeBuilder();
    for (const node of ast) {
      const snippet = match(node)
        .with({ kind: "text" }, (node) => this.compileTextNode(node))
        .with({ kind: "interpolation" }, (node) =>
          this.compileInterpolationNode(node, scope)
        )
        .with({ kind: "if" }, (node) => this.compileIfNode(node, scope))
        .with({ kind: "each" }, (node) => this.compileEachNode(node, scope))
        .with({ kind: "partial" }, (node) =>
          this.compilePartialNode(node, scope)
        )
        .exhaustive();
      builder = builder.add(snippet);
    }
    return builder.build();
  }

  private compileTextNode(node: TextNode): string {
    return JSON.stringify(node.text);
  }

  private compileInterpolationNode(
    node: InterpolationNode,
    scope: string[]
  ): string {
    const code = this.compileAccessor(node.expr, scope);
    if (node.raw) {
      return code;
    }
    return `helpers.escapeHtml(${code})`;
  }

  private compileIfNode(node: IfNode, scope: string[]): string {
    const cond = this.compileAccessor(node.condition, scope, false);
    const thenCode = this.compileAst(node.thenBranch, scope);
    const elseCode = node.otherwise
      ? this.compileAst(node.otherwise, scope)
      : '""';
    return `(${cond} ? ${thenCode} : ${elseCode})`;
  }

  private compileEachNode(node: EachNode, scope: string[]): string {
    const itemsCode = this.compileAccessor(node.items, scope, false);
    const newScope = node.index
      ? [...scope, node.as, node.index]
      : [...scope, node.as];
    const bodyCode = this.compileAst(node.body, newScope);
    const params = node.index ? `${node.as}, ${node.index}` : node.as;
    return `(${itemsCode} || []).map((${params}) => ${bodyCode}).join("")`;
  }

  private compilePartialNode(node: PartialNode, scope: string[]): string {
    const nameCode =
      typeof node.name === "string"
        ? JSON.stringify(node.name)
        : this.compileAccessor(node.name, scope, false);

    let contextCode = "ctx";
    if (node.params) {
      const paramEntries = Object.entries(node.params)
        .map(
          ([key, expr]) =>
            `${JSON.stringify(key)}: ${this.compileAccessor(
              expr,
              scope,
              false
            )}`
        )
        .join(", ");
      contextCode = `{ ...ctx, ${paramEntries} }`;
    }

    return `(await (async () => {
      const partialName = ${nameCode};
      let partialTpl = options.partials?.[partialName];
      if (typeof partialTpl !== "string" && options.partialResolver) {
        partialTpl = await options.partialResolver(partialName);
        if (typeof partialTpl === "string") {
          options.partials = { ...(options.partials ?? {}), [partialName]: partialTpl };
        }
      }
      if (typeof partialTpl !== 'string') {
        throw new Error(\`Partial '\${partialName}' not found or is not a string.\`);
      }
      return render(partialTpl, ${contextCode}, options);
    })())`;
  }

  private compileAccessor(
    expr: AccessorNode,
    scope: string[],
    withWrapper = true
  ): string {
    const first = expr.path[0];
    const isHelper = first && Object.hasOwn(this.allHelpers, first);
    const isScoped = first && scope.includes(first);

    // Handle helper functions that might take additional arguments
    if (isHelper && expr.path.length > 1) {
      // For helpers like truncate(value, length), we need to handle the arguments
      const helperName = first;
      const args = expr.path.slice(1).join(", ");
      let code = `helpers.${helperName}`;

      // Apply any pipes to the helper result
      for (const pipe of expr.pipes) {
        code = `helpers.${pipe}(${code}(${args}))`;
      }

      if (withWrapper) {
        return `(() => { const result = ${code}; return result !== undefined && result !== null ? result : (() => { throw new Error('Helper ${helperName} returned null/undefined'); })(); })()`;
      }
      return code;
    }

    let code = isScoped
      ? expr.path.join(".")
      : isHelper && expr.path.length === 1
      ? `helpers.${first}`
      : `ctx.${expr.path.join(".")}`;

    for (const pipe of expr.pipes) {
      code = `helpers.${pipe}(${code})`;
    }

    if (withWrapper) {
      // Use single quotes for the error message to avoid nested backtick issues
      const pathStr = expr.path.join(".");
      return `(${code} !== undefined && ${code} !== null ? ${code} : (() => { throw new Error('Missing ${pathStr}'); })())`;
    }
    return code;
  }
}
