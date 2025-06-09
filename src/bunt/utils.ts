import type { Token } from "./tokenizer";

// Type guard functions for token types
export const isTextToken = (token: Token): token is Token & { type: "text" } => token.type === "text";
export const isIdentifierToken = (token: Token): token is Token & { type: "identifier" } => token.type === "identifier";
