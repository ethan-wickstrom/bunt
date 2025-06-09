


import { compile } from "./compiler";
import { templateCache } from "./cache";
import type { Ctx } from "./types";
import { writeFile, unlink } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { existsSync } from "node:fs";

function keyOf(tpl: string): string {
  const hash = Bun.hash.xxHash64(tpl);
  return hash.toString(36);
}

export async function render(tpl: string, ctx: Ctx): Promise<string> {
  const key = keyOf(tpl);
  let fn = templateCache.get(key);


  if (!fn) {
    const result = compile(tpl);
    if (result.isErr()) throw new Error(result.error.message);

    let { source } = result.value;

    // Ensure .bunt-cache directory exists
    const cacheDir = join(__dirname, ".bunt-cache");
    if (!existsSync(cacheDir)) {
      await Bun.write(`${cacheDir}/.keep`, ""); // create a file to ensure dir exists
    }

    // Write the generated source to a cache file in .bunt-cache
    const cacheFile = join(cacheDir, `bunt-tpl-${key}.ts`);

    // Compute the relative path from the cache file to helpers.ts
    const helpersPath = resolve(__dirname, "./helpers.ts");
    const relHelpersPath = relative(dirname(cacheFile), helpersPath).replace(/\\/g, "/");
    source = source.replace("../helpers", relHelpersPath.startsWith(".") ? relHelpersPath : `./${relHelpersPath}`);

    await writeFile(cacheFile, source, "utf8");

    try {
      // Use Bun.build() to bundle the generated source
      const buildResult = await Bun.build({
        entrypoints: [cacheFile],
        target: "bun",
        format: "esm",
        naming: `[name]-${key}.[ext]`,
        sourcemap: "none",
        minify: false,
        outdir: cacheDir,
      });

      if (!buildResult.success || buildResult.outputs.length === 0) {
        const errors = buildResult.logs
          ? buildResult.logs.filter(log => log.level === "error").map(log => log.message).join(", ")
          : "Unknown error";
        throw new Error(`Template bundling failed: ${errors}`);
      }

      // Get the bundled file path
      const bundledFile = buildResult.outputs[0]?.path;
      if (!bundledFile) throw new Error("Bundled file path not found");
      // Import the bundled file dynamically
      const module = await import(`${bundledFile}?t=${Date.now()}`);
      fn = module.default as (ctx: Ctx) => string;
      templateCache.set(key, fn);
    } finally {
      // Clean up the cache file (not the bundle)
      await unlink(cacheFile).catch(() => {});
    }
  }

  return fn(ctx);
}
