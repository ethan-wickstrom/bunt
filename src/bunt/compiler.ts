import { parse } from "./parser";
import type {
  AST,
  CompileResult,
  ExprNode,
  TextNode,
  IfNode,
  EachNode,
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

  const compiler = new Compiler(templateId, parsed.value, options.helpers ?? {});
  return compiler.compile();
}

class Compiler {
  private readonly templateId: string;
  private readonly ast: AST;
  private readonly allHelpers: Helpers;

  constructor(templateId: string, ast: AST, customHelpers: Helpers) {
    this.templateId = templateId;
    this.ast = ast;
    this.allHelpers = { ...standardHelpers, ...customHelpers };
  }

  public compile(): CompileResult {
    const body = this.compileAst(this.ast, []);
    const fnName = `render_${this.templateId.replace(/[^\w]/g, "_")}`;
    const source = [
      'import { standardHelpers } from "../helpers";',
      'import type { Ctx, Helpers } from "../types";',
      `export default function ${fnName}(ctx: Ctx, customHelpers: Helpers = {}): string {`,
      "  const helpers = { ...standardHelpers, ...customHelpers };",
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
        .with({ kind: "expr" }, (node) => this.compileExprNode(node, scope))
        .with({ kind: "if" }, (node) => this.compileIfNode(node, scope))
        .with({ kind: "each" }, (node) => this.compileEachNode(node, scope))
        .exhaustive();
      builder = builder.add(snippet);
    }
    return builder.build();
  }

  private compileTextNode(node: TextNode): string {
    return JSON.stringify(node.text);
  }

  private compileExprNode(node: ExprNode, scope: string[]): string {
    return this.compileExpr(node, scope);
  }

  private compileIfNode(node: IfNode, scope: string[]): string {
    const cond = this.compileExpr(node.condition, scope, false);
    const thenCode = this.compileAst(node.thenBranch, scope);
    const elseCode = node.otherwise ? this.compileAst(node.otherwise, scope) : '""';
    return `(${cond} ? ${thenCode} : ${elseCode})`;
  }

  private compileEachNode(node: EachNode, scope: string[]): string {
    const itemsCode = this.compileExpr(node.items, scope, false);
    const newScope = node.index ? [...scope, node.as, node.index] : [...scope, node.as];
    const bodyCode = this.compileAst(node.body, newScope);
    const params = node.index ? `${node.as}, ${node.index}` : node.as;
    return `(${itemsCode} || []).map((${params}) => ${bodyCode}).join("")`;
  }

  private compileExpr(expr: ExprNode, scope: string[], withWrapper = true): string {
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
      const pathStr = expr.path.join('.')
      return `(${code} !== undefined && ${code} !== null ? ${code} : (() => { throw new Error('Missing ${pathStr}'); })())`;
    }
    return code;
  }
}