import type { BuntNode, ParsedTemplate, CompilationResult } from "./types";
import type { Result } from "neverthrow";
import { ok, err } from "neverthrow";
import { relative, dirname, join } from "node:path";

function* generateCode(node: BuntNode): Generator<string> {
  switch (node.type) {
    case "root":
      for (const child of node.children) {
        yield* generateCode(child);
      }
      break;
    case "literal":
      yield `__output += \`${node.value.replace(/`/g, "\\`")}\`;\n`;
      break;
    case "escaped":
      yield `__output += escapeHtml(${node.value});\n`;
      break;
    case "unescaped":
      yield `__output += ${node.value};\n`;
      break;
    case "code":
      yield `${node.value}\n`;
      break;
    case "comment":
      // Comments are ignored
      break;
  }
}

export function compile(
  parsed: ParsedTemplate,
  importer?: string,
): Result<CompilationResult, Error> {
  const { ast, frontmatter } = parsed;

  if (!frontmatter) {
    return err(
      new Error("Template is missing frontmatter with a props type definition."),
    );
  }

  const { propsTypeName, propsTypeDefinition } = frontmatter;

  const templateCode = Array.from(generateCode(ast)).join("");

  // TODO: This is a hack. We should have a better way of resolving the runtime.
  const runtimePath = importer
    ? relative(dirname(importer), join(process.cwd(), "src", "bunt", "runtime.ts"))
    : "./runtime";


  const code = `import { ok, err, Result } from "neverthrow";
import { escapeHtml } from "${runtimePath.replace(/\.ts$/, '.js')}";

${propsTypeDefinition}

export function render(props: ${propsTypeName}): Result<string, Error> {
  try {
    let __output = "";
    ${templateCode}
    return ok(__output);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
  `;

  return ok({ code });
}
