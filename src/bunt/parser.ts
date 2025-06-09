import { match, P } from "ts-pattern";
import type { BuntNode, ParsedTemplate } from "./types";
import { ok, err, type Result } from "neverthrow";

const openTag = "<%";
const closeTag = "%>";
const frontmatterFence = "---";

function parseFrontmatter(
  template: string,
): Result<{ frontmatter: ParsedTemplate["frontmatter"]; body: string }, Error> {
  if (!template.startsWith(frontmatterFence)) {
    return ok({ frontmatter: null, body: template });
  }

  const endFenceIndex = template.indexOf(
    frontmatterFence,
    frontmatterFence.length,
  );
  if (endFenceIndex === -1) {
    return err(new Error("Unclosed frontmatter block."));
  }

  const frontmatterContent = template
    .slice(frontmatterFence.length, endFenceIndex)
    .trim();
  const body = template.slice(endFenceIndex + frontmatterFence.length).trimStart();

  const typeMatch = /type\s+(\w+)\s*=\s*/.exec(frontmatterContent);
  if (!typeMatch || !typeMatch[1]) {
    return err(new Error("Could not find a 'type' definition in frontmatter."));
  }

  const propsTypeName = typeMatch[1];
  return ok({
    frontmatter: {
      propsTypeName,
      propsTypeDefinition: frontmatterContent,
    },
    body,
  });
}

export function parse(template: string): Result<ParsedTemplate, Error> {
  return parseFrontmatter(template).andThen(({ frontmatter, body }) => {
    const root: BuntNode = { type: "root", children: [] };
    const stack: BuntNode[] = [root];
    let position = 0;

    while (position < body.length) {
      const openTagIndex = body.indexOf(openTag, position);

      if (openTagIndex === -1) {
        if (position < body.length) {
          const parent = stack[stack.length - 1];
          if (parent?.type === "root") {
            parent.children.push({
              type: "literal",
              value: body.slice(position),
            });
          }
        }
        break;
      }

      if (openTagIndex > position) {
        const parent = stack[stack.length - 1];
        if (parent?.type === "root") {
          parent.children.push({
            type: "literal",
            value: body.slice(position, openTagIndex),
          });
        }
      }

      const closeTagIndex = body.indexOf(
        closeTag,
        openTagIndex + openTag.length,
      );
      if (closeTagIndex === -1) {
        return err(new Error("Unclosed tag."));
      }

      const tagContent = body
        .slice(openTagIndex + openTag.length, closeTagIndex)
        .trim();

      const node: BuntNode = match(tagContent)
        .with(P.string.startsWith("="), (c) => ({
          type: "escaped" as const,
          value: c.slice(1).trim(),
        }))
        .with(P.string.startsWith("-"), (c) => ({
          type: "unescaped" as const,
          value: c.slice(1).trim(),
        }))
        .with(P.string.startsWith("#"), (c) => ({
          type: "comment" as const,
          value: c.slice(1).trim(),
        }))
        .otherwise((c) => ({
          type: "code" as const,
          value: c,
        }));

      const parent = stack[stack.length - 1];
      if (parent?.type === "root") {
        parent.children.push(node);
      }

      position = closeTagIndex + closeTag.length;
    }

    return ok({ ast: root, frontmatter });
  });
}
