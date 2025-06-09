#!/usr/bin/env bun

import { Glob } from "bun";
import { compile } from "./compiler";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const USAGE = "Usage: bunt <glob>";

/** Simple CLI: `bunt <glob>` */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(USAGE);
    process.exit(1);
  }

  const pattern = args[0];
  if (!pattern) {
    console.error(USAGE);
    process.exit(1);
  }

  const glob = new Glob(pattern);
  for await (const file of glob.scan(".")) {
    if (!file.endsWith(".bnt")) continue;
    const src = await Bun.file(file).text();
    const id = file.replace(/\.bnt$/, "");
    const res = compile(src, id);
    if (res.isErr()) {
      console.error(`✖ ${file}: ${res.error.message}`);
      continue;
    }
    const outPath = file.replace(/\.bnt$/, ".ts");
    await mkdir(dirname(outPath), { recursive: true });
    await Bun.write(outPath, res.value.source);
    console.log(`✔ ${outPath}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
