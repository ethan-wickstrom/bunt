import { compile } from "./compiler";
import { templateCache } from "./cache";
import type { Ctx } from "./types";

function keyOf(tpl: string): string {
  // Convert to base36 for shorter keys
  const hash = Bun.hash.xxHash64(tpl);
  return hash.toString(36);
}

/**
 * Render a template entirely in-memory. Caches the transpiled function
 * to avoid repeated transpilation or disk I/O.
 */
export async function render(tpl: string, ctx: Ctx): Promise<string> {
  const key = keyOf(tpl);
  let fn = templateCache.get(key);

  if (!fn) {
    const result = compile(tpl);
    if (result.isErr()) throw new Error(result.error.message);

    const { functionBody, helpersCode } = result.value;
    
    // The full body for our new function. It will define helpers `h`
    // and then execute the template logic.
    const fullRenderBody = `${helpersCode}\n${functionBody}`;
    
    // Create the render function in-memory. It takes one argument: `ctx`.
    fn = new Function("ctx", fullRenderBody) as (ctx: Ctx) => string;
    templateCache.set(key, fn);
  }

  return fn(ctx);
}
