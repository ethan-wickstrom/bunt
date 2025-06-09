import type { BunPlugin } from "bun";
import { compile } from "./bunt/compiler";

/**
 * Bun plugin to load `.bnt` templates as TS modules.
 *
 * Usage: add `{ plugins: ["./src/plugin.ts"] }` to your bunfig.toml.
 */
export const buntPlugin: BunPlugin = {
  name: "bunt",
  setup(build) {
    build.onLoad({ filter: /\.bnt$/ }, async ({ path }) => {
      const src = await Bun.file(path).text();
      const pathUtil = await import("node:path");
      const id = pathUtil.basename(path, ".bnt");
      const res = compile(src, id);
      if (res.isErr()) {
        throw new Error(`${path}: ${res.error.message}`);
      }
      return {
        contents: res.value.source,
        loader: "ts",
      };
    });
  },
};
