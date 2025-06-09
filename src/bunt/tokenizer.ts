import { type Result, ok, err } from "neverthrow";

// Token ADT using discriminated unions for type safety
export type Token =
  | { type: "text"; value: string; position: number }
  | { type: "open-tag"; position: number }
  | { type: "close-tag"; position: number }
  | { type: "open-triple-tag"; position: number }
  | { type: "close-triple-tag"; position: number }
  | { type: "identifier"; value: string; position: number }
  | { type: "if"; position: number }
  | { type: "each"; position: number }
  | { type: "else"; position: number }
  | { type: "as"; position: number }
  | { type: "partial"; position: number }
  | { type: "with"; position: number }
  | { type: "pipe"; position: number }
  | { type: "dot"; position: number }
  | { type: "slash"; position: number }
  | { type: "comma"; position: number }
  | { type: "equals"; position: number }
  | { type: "open-paren"; position: number }
  | { type: "close-paren"; position: number }
  | { type: "greater-than"; position: number }
  | { type: "hash"; position: number }
  | { type: "eof"; position: number };

// Token constructor functions for type-safe token creation
export const Token = {
  text: (value: string, position: number): Token => ({ type: "text", value, position }),
  openTag: (position: number): Token => ({ type: "open-tag", position }),
  closeTag: (position: number): Token => ({ type: "close-tag", position }),
  openTripleTag: (position: number): Token => ({ type: "open-triple-tag", position }),
  closeTripleTag: (position: number): Token => ({ type: "close-triple-tag", position }),
  identifier: (value: string, position: number): Token => ({ type: "identifier", value, position }),
  if: (position: number): Token => ({ type: "if", position }),
  each: (position: number): Token => ({ type: "each", position }),
  else: (position: number): Token => ({ type: "else", position }),
  as: (position: number): Token => ({ type: "as", position }),
  partial: (position: number): Token => ({ type: "partial", position }),
  with: (position: number): Token => ({ type: "with", position }),
  pipe: (position: number): Token => ({ type: "pipe", position }),
  dot: (position: number): Token => ({ type: "dot", position }),
  slash: (position: number): Token => ({ type: "slash", position }),
  comma: (position: number): Token => ({ type: "comma", position }),
  equals: (position: number): Token => ({ type: "equals", position }),
  openParen: (position: number): Token => ({ type: "open-paren", position }),
  closeParen: (position: number): Token => ({ type: "close-paren", position }),
  greaterThan: (position: number): Token => ({ type: "greater-than", position }),
  hash: (position: number): Token => ({ type: "hash", position }),
  eof: (position: number): Token => ({ type: "eof", position }),
};

// Tokenizer error types
export type TokenizerError = {
  type: "unclosed-tag";
  message: string;
  position: number;
} | {
  type: "unexpected-character";
  message: string;
  position: number;
  character: string;
} | {
  type: "unknown-keyword";
  message: string;
  position: number;
  keyword: string;
};

/**
 * Tokenizer for Bunt template syntax
 */
export class Tokenizer {
  private readonly src: string;
  private readonly tokens: Token[] = [];
  private pos = 0;

  constructor(src: string) {
    this.src = src;
  }

  /**
   * Tokenize the entire source string
   */
  public tokenize(): Result<Token[], TokenizerError> {
    while (this.pos < this.src.length) {
      const remaining = this.src.slice(this.pos);
      if (remaining.startsWith("{{{")) {
        const scanResult = this.scanTag(true);
        if (scanResult.isErr()) return err(scanResult.error);
      } else if (remaining.startsWith("{{")) {
        const scanResult = this.scanTag(false);
        if (scanResult.isErr()) return err(scanResult.error);
      } else {
        this.scanText();
      }
    }
    this.tokens.push(Token.eof(this.src.length));
    return ok(this.tokens);
  }

  private scanText(): void {
    const start = this.pos;
    let end = this.src.indexOf("{{", this.pos);
    // If '{{' is not found, the text runs to the end of the string.
    if (end === -1) {
      end = this.src.length;
    }
    const text = this.src.slice(this.pos, end);
    if (text) {
      this.tokens.push(Token.text(text, start));
    }
    this.pos = end;
  }

  private scanTag(isTriple: boolean): Result<void, TokenizerError> {
    const tagStart = this.pos;
    const openToken = isTriple ? Token.openTripleTag : Token.openTag;
    const closeStr = isTriple ? "}}}" : "}}";
    const openLen = isTriple ? 3 : 2;

    this.tokens.push(openToken(this.pos));
    this.pos += openLen;

    while (this.pos < this.src.length) {
      if (this.src.slice(this.pos).startsWith(closeStr)) {
        this.pos += openLen;
        const closeToken = isTriple ? Token.closeTripleTag : Token.closeTag;
        this.tokens.push(closeToken(this.pos - openLen));
        return ok(undefined);
      }

      const char = this.src[this.pos];
      if (char === undefined) {
        // For parser compatibility, use the parser's error message
        return err({
          type: "unclosed-tag",
          message: "Expected '}}' after expression.",
          position: tagStart,
        });
      }

      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }

      // Special handling for pipe operator: |>
      if (char === "|" && this.src[this.pos + 1] === ">") {
        this.tokens.push(Token.pipe(this.pos));
        this.pos++;
        this.tokens.push(Token.greaterThan(this.pos));
        this.pos++;
        continue;
      }

      switch (char) {
        case "|":
          this.tokens.push(Token.pipe(this.pos));
          this.pos++;
          break;
        case ".":
          this.tokens.push(Token.dot(this.pos));
          this.pos++;
          break;
        case ",":
          this.tokens.push(Token.comma(this.pos));
          this.pos++;
          break;
        case "=":
          this.tokens.push(Token.equals(this.pos));
          this.pos++;
          break;
        case "(":
          this.tokens.push(Token.openParen(this.pos));
          this.pos++;
          break;
        case ")":
          this.tokens.push(Token.closeParen(this.pos));
          this.pos++;
          break;
        case ">":
          this.tokens.push(Token.greaterThan(this.pos));
          this.pos++;
          break;
        case "/": {
          this.tokens.push(Token.slash(this.pos));
          this.pos++;
          // After '/', scan for 'if' or 'each' as a keyword
          const nextChar = this.src[this.pos];
          if (nextChar && /[a-zA-Z]/.test(nextChar)) {
            const keywordResult = this.scanKeyword();
            if (keywordResult.isErr()) {
              return err(keywordResult.error);
            }
          }
          break;
        }
        case "#": {
          this.tokens.push(Token.hash(this.pos));
          this.pos++;
          const keywordResult = this.scanKeyword();
          if (keywordResult.isErr()) {
            return err(keywordResult.error);
          }
          break;
        }
        default:
          if (/[a-zA-Z_]/.test(char)) {
            this.scanIdentifier();
          } else {
            return err({
              type: "unexpected-character",
              message: `Unexpected character: ${char}`,
              position: this.pos,
              character: char,
            });
          }
      }
    }

    const expected = isTriple ? "}}}" : "}}";
    return err({
      type: "unclosed-tag",
      message: `Expected '${expected}' after expression.`,
      position: tagStart,
    });
  }

  private scanKeyword(): Result<void, TokenizerError> {
    const start = this.pos;
    while (this.pos < this.src.length && /[a-zA-Z]/.test(this.src[this.pos] ?? "")) {
      this.pos++;
    }
    const text = this.src.slice(start, this.pos);
    
    switch (text) {
      case "if":
        this.tokens.push(Token.if(start));
        break;
      case "each":
        this.tokens.push(Token.each(start));
        break;
      case "partial":
        this.tokens.push(Token.partial(start));
        break;
      default:
        return err({
          type: "unknown-keyword",
          message: `Unknown keyword #${text}`,
          position: start,
          keyword: text,
        });
    }
    
    return ok(undefined);
  }

  private scanIdentifier(): void {
    const start = this.pos;
    while (this.pos < this.src.length && /[a-zA-Z0-9_]/.test(this.src[this.pos] ?? "")) {
      this.pos++;
    }
    const text = this.src.slice(start, this.pos);
    
    switch (text) {
      case "else":
        this.tokens.push(Token.else(start));
        break;
      case "as":
        this.tokens.push(Token.as(start));
        break;
      case "with":
        this.tokens.push(Token.with(start));
        break;
      default:
        this.tokens.push(Token.identifier(text, start));
    }
  }
}

/**
 * Tokenize a template string
 */
export function tokenize(src: string): Result<Token[], TokenizerError> {
  const tokenizer = new Tokenizer(src);
  return tokenizer.tokenize();
}
