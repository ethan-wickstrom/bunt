import type { Result } from "neverthrow";

/** A literal text segment. */
export type TextNode = {
  kind: "text";
  text: string;
};

/** A data access expression. */
export type AccessorNode = {
  kind: "accessor";
  /** Dot-path for property access, e.g. ["user","name"] */
  path: string[];
  /** Piped helpers, e.g. ["trim","upper"] */
  pipes: string[];
};

/** An interpolation expression segment. */
export type InterpolationNode = {
  kind: "interpolation";
  expr: AccessorNode;
  raw: boolean;
};

/** A conditional block. */
export type IfNode = {
  kind: "if";
  /** The expression to evaluate. */
  condition: AccessorNode;
  /** The AST to render if the condition is truthy. */
  thenBranch: AST;
  /** The AST to render if the condition is falsy. */
  otherwise?: AST;
};

/** A loop block. */
export type EachNode = {
  kind: "each";
  /** The expression for the array to iterate over. */
  items: AccessorNode;
  /** The alias for the item in the loop. */
  as: string;
  /** The alias for the index in the loop. */
  index?: string;
  /** The AST to render for each item. */
  body: AST;
};

/** A partial/include block. */
export type PartialNode = {
  kind: "partial";
  /** Name or path of the partial to include. Can be a literal string or a dynamic expression. */
  name: string | AccessorNode;
  /** Optional context/parameters to pass. */
  params?: Record<string, AccessorNode>;
};

/** Full template AST. */
export type AST = Array<
  TextNode | InterpolationNode | IfNode | EachNode | PartialNode
>;

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

/** A map of helper functions. */
export type Helpers = Record<string, (...args: never[]) => unknown>;

/** A function that resolves a partial name to its template string. */
export type PartialResolver = (name: string) => string | Promise<string>;

/** The signature for the top-level render function. */
export type TopLevelRenderFn = (
  tpl: string,
  ctx: Ctx,
  options?: RenderOptions
) => Promise<string>;

/** Options for the render function. */
export type RenderOptions = {
  helpers?: Helpers;
  /**
   * The compilation target.
   * 'module' - generates a full ES module (for pre-compilation).
   * 'jit' - generates a function body for just-in-time compilation.
   */
  target?: "module" | "jit";
  /** A map of pre-loaded partial templates. */
  partials?: Record<string, string>;
  /** A function to dynamically load partials. */
  partialResolver?: PartialResolver;
};

/** Result type for compile(). */
export type CompileResult = Result<CompileSuccess, CompileFailure>;
