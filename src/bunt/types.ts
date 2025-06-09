import type { Result } from "neverthrow";

export type BuntNode =
  | { type: "root"; children: BuntNode[] }
  | { type: "literal"; value: string }
  | { type: "escaped"; value: string }
  | { type: "unescaped"; value: string }
  | { type: "comment"; value: string }
  | { type: "code"; value: string };

/**
 * Defines the shape of the props that a template requires.
 * This is extracted from the template's frontmatter.
 */
export type TemplateProps = {
  [key: string]: unknown;
};

/**
 * A compiled template function.
 * It takes props and returns a Result containing either the rendered string or an error.
 */
export type TemplateFn<T extends TemplateProps> = (
  props: T,
) => Result<string, Error>;

/**
 * The result of parsing, containing the AST and any extracted frontmatter.
 */
export type ParsedTemplate = {
  ast: BuntNode;
  frontmatter: {
    propsTypeName: string;
    propsTypeDefinition: string;
  } | null;
};

/**
 * The result of a compilation, containing the generated TypeScript code.
 */
export type CompilationResult = {
  code: string;
};
