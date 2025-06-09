


import { compile } from "./compiler";
import { templateCache } from "./cache";
import type { Ctx } from "./types";
import { loadFromDiskCache } from "./fileCache";

function keyOf(tpl: string): string {
  const hash = Bun.hash.xxHash64(tpl);
  return hash.toString(36);
}

export async function render(tpl: string, ctx: Ctx): Promise<string> {
  const key = keyOf(tpl);
  let fn = templateCache.get(key);

  if (!fn) {
    const result = compile(tpl);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    fn = await loadFromDiskCache(key, result.value);
    templateCache.set(key, fn);
  }

  return fn(ctx);
}
