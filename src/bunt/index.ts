import type { BunPlugin } from "bun";
import { parse } from "./parser";
import { compile as buntCompile } from "./compiler";

export type { TemplateFn, TemplateProps } from "./types";

/**
 * Compiles a Bunt template string into executable TypeScript code.
 *
 * @param template The raw template string.
 * @returns A Result containing the compiled TypeScript code or an error.
 */
export function compile(template: string, importer?: string) {
  return parse(template).andThen((parsed) => buntCompile(parsed, importer));
}

/**
 * A Bun plugin to handle .bunt files.
 */
export const buntPlugin: BunPlugin = {
  name: "bunt",
  setup(build) {
    const transpiler = new Bun.Transpiler({ loader: "ts" });

    build.onLoad({ filter: /\.bunt$/ }, async (args) => {
      const fileContent = await Bun.file(args.path).text();
      const compiled = compile(fileContent, args.path);

      if (compiled.isErr()) {
        // In a real-world scenario, you'd want to return proper build errors.
        // For now, we'll just throw.
        throw compiled.error;
      }

      return {
        contents: transpiler.transformSync(compiled.value.code),
        loader: "ts",
      };
    });
  },
};
