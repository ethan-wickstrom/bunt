


import { compile } from "./compiler";
import { templateCache } from "./cache";
import type { Ctx, RenderOptions } from "./types";
import { loadFromDiskCache } from "./fileCache";

function keyOf(tpl: string, options: RenderOptions): string {
  const helpersKey = Object.keys(options.helpers ?? {}).join(",");
  const combined = `${tpl}:${helpersKey}`;
  const hash = Bun.hash.xxHash64(combined);
  return hash.toString(36);
}

export async function render(
  tpl: string,
  ctx: Ctx,
  options: RenderOptions = {}
): Promise<string> {
  const key = keyOf(tpl, options);
  let fn = templateCache.get(key);

  if (!fn) {
    const result = compile(tpl, key, options);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    fn = await loadFromDiskCache(key, result.value);
    templateCache.set(key, fn);
  }

  return fn(ctx, options.helpers);
}
