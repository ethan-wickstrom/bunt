import { writeFile, unlink } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { existsSync } from "node:fs";
import type { CompileSuccess } from "./types";
import type { RenderFn } from "./cache";

/**
 * Loads a compiled template function from the file-based cache.
 * This involves writing the compiled source to a temporary file,
 * bundling it with Bun, dynamically importing the result, and then
 * cleaning up the temporary file.
 *
 * @param key The cache key, used for generating unique filenames.
 * @param compiled The successful compilation result.
 * @returns A promise that resolves to the executable render function.
 */
export async function loadFromDiskCache(key: string, compiled: CompileSuccess): Promise<RenderFn> {
  let { source } = compiled;

  // Ensure .bunt-cache directory exists
  const cacheDir = join(__dirname, ".bunt-cache");
  if (!existsSync(cacheDir)) {
    // Using Bun.write to create a directory is a common pattern.
    await Bun.write(`${cacheDir}/.keep`, "");
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

    // Import the bundled file dynamically, appending a timestamp to bypass module cache
    const module: { default: unknown } = await import(`${bundledFile}?t=${Date.now()}`);
    if (typeof module.default !== "function") {
      throw new Error(`Template ${key} did not export a default function.`);
    }
    return module.default as RenderFn;
  } finally {
    // Clean up the temporary source file (not the final bundle)
    await unlink(cacheFile).catch(() => {});
  }
}