import { unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
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
  const { source } = compiled;

  // Ensure .bunt-cache directory exists
  const cacheDir = join(__dirname, ".bunt-cache");
  await mkdir(cacheDir, { recursive: true });

  // Write the generated source to a cache file in .bunt-cache
  const cacheFile = join(cacheDir, `bunt-tpl-${key}.ts`);
  await Bun.write(cacheFile, source);

  try {
    // Use Bun.build() to bundle the generated source
    const buildResult = await Bun.build({
      entrypoints: [cacheFile],
      target: "bun",
      format: "esm",
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