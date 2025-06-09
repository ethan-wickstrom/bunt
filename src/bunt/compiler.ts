import { parse } from "./parser";
import type { AST, CompileResult, ExprNode } from "./types";
import { ok, err } from "neverthrow";
import { match } from "ts-pattern";
import { standardHelpers } from "./helpers";

/**
 * Compile a template string into a TypeScript render function.
 *
 * @param src         The raw template source.
 * @param templateId  Identifier used in generated type/function names.
 */
export function compile(
  src: string,
  templateId: string = "Template"
): CompileResult {
  const parsed = parse(src);
  if (parsed.isErr()) {
    return err({
      message: parsed.error.message,
      position: parsed.error.position,
    });
  }

  const compiler = new Compiler(templateId, parsed.value);
  return compiler.compile();
}

class Compiler {
  private readonly templateId: string;
  private readonly ast: AST;

  constructor(templateId: string, ast: AST) {
    this.templateId = templateId;
    this.ast = ast;
  }

  public compile(): CompileResult {
    const body = this.compileAst(this.ast, []);
    const fnName = `render_${this.templateId.replace(/[^\w]/g, "_")}`;
    const helpersCode =
      "const h={upper:v=>String(v).toUpperCase(),lower:v=>String(v).toLowerCase(),capitalize:v=>{const s=String(v);return s.charAt(0).toUpperCase()+s.slice(1)},truncate:(v,l=20)=>{const s=String(v);return s.length>l?s.slice(0,l)+'...':s},json:v=>JSON.stringify(v),date:(v,loc,opt)=>{const d=v instanceof Date?v:new Date(String(v));return d.toLocaleDateString(loc,opt)},escapeHtml:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')};";
    const functionBody = `const helpers={...h,...ctx};return ${body}`;
    const source = `${helpersCode}export function ${fnName}(ctx){${functionBody}}`;
    return ok({ source, fnName, functionBody, helpersCode });
  }

  private compileAst(ast: AST, scope: string[]): string {
    return ast
      .map((node) =>
        match(node)
          .with({ kind: "text" }, ({ text }) => JSON.stringify(text))
          .with({ kind: "expr" }, (expr) => this.compileExpr(expr, scope))
          .with({ kind: "if" }, ({ condition, thenBranch, otherwise }) => {
            const cond = this.compileExpr(condition, scope, false);
            const thenCode = this.compileAst(thenBranch, scope);
            const elseCode = otherwise ? this.compileAst(otherwise, scope) : '""';
            return `(${cond} ? ${thenCode} : ${elseCode})`;
          })
          .with({ kind: "each" }, ({ items, as, index, body }) => {
            const itemsCode = this.compileExpr(items, scope, false);
            const newScope = index ? [...scope, as, index] : [...scope, as];
            const bodyCode = this.compileAst(body, newScope);
            const params = index ? `${as}, ${index}` : as;
            return `(${itemsCode} || []).map((${params}) => ${bodyCode}).join("")`;
          })
          .exhaustive()
      )
      .join(" + ") || '""';
  }

  private compileExpr(expr: ExprNode, scope: string[], withWrapper = true): string {
    const first = expr.path[0];
    const isHelper = first && Object.hasOwn(standardHelpers, first);
    const isScoped = first && scope.includes(first);
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
