import type { CompileSuccess } from "./types";
import { standardHelpers } from "./helpers";
import type { RenderFn } from "./cache";

/**
 * Creates an executable render function from a compiled template source
 * using the Function constructor for just-in-time compilation.
 *
 * @param compiled The successful compilation result from the compiler.
 * @returns An executable render function.
 */
export function JIT(compiled: CompileSuccess): RenderFn {
  const factory = new Function("standardHelpers", compiled.source);
  return factory(standardHelpers) as RenderFn;
}