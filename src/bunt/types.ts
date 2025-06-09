import type { Result } from "neverthrow";

/** A literal text segment. */
export type TextNode = {
  kind: "text";
  text: string;
};

/** An interpolation expression segment. */
export type ExprNode = {
  kind: "expr";
  /** Dot-path for property access, e.g. ["user","name"] */
  path: string[];
  /** Piped helpers, e.g. ["trim","upper"] */
  pipes: string[];
};

/** A conditional block. */
export type IfNode = {
  kind: "if";
  /** The expression to evaluate. */
  condition: ExprNode;
  /** The AST to render if the condition is truthy. */
  thenBranch: AST;
  /** The AST to render if the condition is falsy. */
  otherwise?: AST;
};

/** A loop block. */
export type EachNode = {
  kind: "each";
  /** The expression for the array to iterate over. */
  items: ExprNode;
  /** The alias for the item in the loop. */
  as: string;
  /** The alias for the index in the loop. */
  index?: string;
  /** The AST to render for each item. */
  body: AST;
};

/** Full template AST. */
export type AST = Array<TextNode | ExprNode | IfNode | EachNode>;

/** A generic context object for type-safe templates. */
export type Ctx = Record<string, unknown>;

/** Success payload from compile(). */
export type CompileSuccess = {
  /** Generated TS source for the render function. */
  source: string;
  /** Name of the generated render function. */
  fnName: string;
};

/** Failure payload from compile(). */
export type CompileFailure = {
  /** Human-readable error message. */
  message: string;
  /** Optional character offset of the error. */
  position?: number;
};

/** Result type for compile(). */
export type CompileResult = Result<CompileSuccess, CompileFailure>;

export enum TokenType {
  Text = "Text",
  OpenTag = "OpenTag",
  CloseTag = "CloseTag",
  Identifier = "Identifier",
  If = "If",
  Each = "Each",
  Else = "Else",
  As = "As",
  Pipe = "Pipe",
  Dot = "Dot",
  Slash = "Slash",
  Comma = "Comma",
  GreaterThan = "GreaterThan",
  Hash = "Hash",
  EOF = "EOF",
}

export type Token = {
  type: TokenType;
  value: string;
  position: number;
};
