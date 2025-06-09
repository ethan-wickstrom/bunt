import { compile } from ".";
import { Glob } from "bun";

const glob = new Glob("**/*.bunt");

for await (const file of glob.scan(".")) {
  const content = await Bun.file(file).text();
  const compiled = compile(content);

  if (compiled.isErr()) {
    console.error(`Error compiling ${file}:`, compiled.error);
    continue;
  }

  const tsPath = file.replace(/\.bunt$/, ".bunt.ts");
  await Bun.write(tsPath, compiled.value.code);
  console.log(`Compiled ${file} to ${tsPath}`);
}
