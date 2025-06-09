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
  private ctxKeys = new Set<string>();

  constructor(templateId: string, ast: AST) {
    this.templateId = templateId;
    this.ast = ast;
  }

  public compile(): CompileResult {
    const body = this.compileAst(this.ast, []);
    const fnName = `render_${this.templateId.replace(/[^\w]/g, "_")}`;

    // Include minimal helpers directly in the generated code for runtime usage
    const helpersCode = `const h={upper:v=>String(v).toUpperCase(),lower:v=>String(v).toLowerCase(),capitalize:v=>{const s=String(v);return s.charAt(0).toUpperCase()+s.slice(1)},truncate:(v,l=20)=>{const s=String(v);return s.length>l?s.slice(0,l)+'...':s},json:v=>JSON.stringify(v),date:(v,loc,opt)=>{const d=v instanceof Date?v:new Date(String(v));return d.toLocaleDateString(loc,opt)},escapeHtml:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')};`;

    const source = `${helpersCode}export function ${fnName}(ctx){const helpers={...h,...ctx};return ${body}}`;
    return ok({ source, fnName });
  }

  private compileAst(ast: AST, scope: string[]): string {
    const parts: string[] = [];
    for (const node of ast) {
      match(node)
        .with({ kind: "text" }, ({ text }) => {
          parts.push(JSON.stringify(text));
        })
        .with({ kind: "expr" }, (expr) => {
          parts.push(this.compileExpr(expr, scope));
        })
        .with({ kind: "if" }, ({ condition, thenBranch, otherwise }) => {
          const conditionCode = this.compileExpr(condition, scope, false);
          const thenCode = this.compileAst(thenBranch, scope);
          const otherwiseCode = otherwise ? this.compileAst(otherwise, scope) : '""';
          parts.push(`(${conditionCode} ? ${thenCode} : ${otherwiseCode})`);
        })
        .with({ kind: "each" }, ({ items, as, index, body }) => {
          const itemsCode = this.compileExpr(items, scope, false);
          const newScope = [...scope, as];
          if (index) newScope.push(index);
          const bodyCode = this.compileAst(body, newScope);
          const params = index ? `${as}, ${index}` : as;
          parts.push(`(${itemsCode} || []).map((${params}) => ${bodyCode}).join("")`);
        })
        .exhaustive();
    }
    return parts.length > 0 ? parts.join(" + ") : '""';
  }

  private compileExpr(expr: ExprNode, scope: string[], withWrapper: boolean = true): string {
    const firstPath = expr.path[0];
    if (firstPath && !Object.keys(standardHelpers).includes(firstPath) && !scope.includes(firstPath)) {
      this.ctxKeys.add(firstPath);
    }
    
    let exprCode = `helpers.${expr.path.join(".")}`;
    if (scope.includes(firstPath ?? '')) {
        exprCode = expr.path.join(".");
    } else if (expr.path.length > 1 || (firstPath && !Object.keys(standardHelpers).includes(firstPath))) {
      exprCode = `ctx.${expr.path.join(".")}`;
    }
    
    for (const pipe of expr.pipes) {
      exprCode = `helpers.${pipe}(${exprCode})`;
    }

    if (withWrapper) {
      return `(${exprCode} !== undefined && ${exprCode} !== null ? ${exprCode} : (() => { throw new Error("Missing \`${expr.path.join(".")}\`"); })())`;
    }
    return exprCode;
  }
}
