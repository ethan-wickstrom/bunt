import { compile } from "./compiler";
import { templateCache } from "./cache";
import type { Ctx } from "./types";

const helpersPath = new URL("./helpers.ts", import.meta.url).href;

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

    let { source, fnName } = result.value;

    // use absolute path for helpers to allow resolution from data URL
    source = source.replace("../helpers", helpersPath);

    const transpiler = new Bun.Transpiler({ loader: "ts" });
    const jsCode = transpiler.transformSync(source);
    const withUrl = `${jsCode}\n//# sourceURL=file:///bunt/${key}.ts`;
    const module = await import(`data:text/javascript,${encodeURIComponent(withUrl)}`);
    fn = module[fnName] as (ctx: Ctx) => string;
    templateCache.set(key, fn);
  }

  return fn(ctx);
}
