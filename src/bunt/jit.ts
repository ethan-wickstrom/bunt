import type { CompileSuccess, TopLevelRenderFn } from "./types";
import { standardHelpers } from "./helpers";
import type { RenderFn } from "./cache";

/**
 * Creates an executable render function from a compiled template source
 * using the Function constructor for just-in-time compilation.
 *
 * @param compiled The successful compilation result from the compiler.
 * @param render The top-level render function, for recursive calls.
 * @returns An executable render function.
 */
export function JIT(compiled: CompileSuccess, render: TopLevelRenderFn): RenderFn {
  const factory = new Function("standardHelpers", "render", compiled.source);
  return factory(standardHelpers, render) as RenderFn;
}
