import { compile } from "./compiler";
import type { Ctx } from "./types";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Dynamically render a template string at runtime (no build step).
 *
 * @param tpl  Template source.
 * @param ctx  Context object (keys must match expressions).
 */
export async function render(
  tpl: string,
  ctx: Ctx
): Promise<string> {
  const res = compile(tpl, "Runtime");
  if (res.isErr()) throw new Error(res.error.message);

  // Create a temporary file for the generated code
  const tempFile = join(tmpdir(), `bunt-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  
  try {
    const transpiler = new Bun.Transpiler({ loader: "ts" });
    const js = await transpiler.transform(res.value.source, "ts");
    writeFileSync(tempFile, js);
    
    const mod = await import(tempFile);
    const fn = mod[res.value.fnName] as (ctx: Ctx) => string;
    if (!fn) {
      throw new Error(`Function ${res.value.fnName} not found in compiled module. Available: ${Object.keys(mod).join(', ')}`);
    }
    return fn(ctx);
  } finally {
    // Clean up the temporary file
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}
