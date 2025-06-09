import type { AST, ExprNode, IfNode, EachNode, PartialNode } from "./types";
import { type Result, ok, err } from "neverthrow";
import { tokenize, type Token } from "./tokenizer";
import { isIdentifierToken, isTextToken } from "./utils";

export function parse(
  src: string
): Result<AST, { message: string; position: number }> {
  const tokenResult = tokenize(src);
  if (tokenResult.isErr()) {
    return err({
      message: tokenResult.error.message,
      position: tokenResult.error.position
    });
  }
  
  try {
    const parser = new Parser(tokenResult.value, src);
    return ok(parser.parse());
  } catch (e) {
    if (e instanceof ParseError) {
      return err({ message: e.message, position: e.position });
    }
    return err({ message: "An unknown error occurred", position: 0 });
  }
}

class Parser {
  private readonly tokens: Token[];
  private readonly src: string;
  private pos = 0;

  constructor(tokens: Token[], src: string) {
    this.tokens = tokens;
    this.src = src;
  }

  public parse(): AST {
    return this.parseUntil();
  }

  private parseUntil(stopTypes: Token["type"][] = []): AST {
    const ast: AST = [];
    while (!this.isAtEnd()) {
      const current = this.peek();
      if (current.type === "text") {
        const token = this.advance();
        if (isTextToken(token)) {
          ast.push({ kind: "text", text: token.value });
        }
      } else if (current.type === "open-tag") {
        const nextToken = this.tokens[this.pos + 1];
        if (nextToken && stopTypes.includes(nextToken.type)) {
          return ast;
        }
        ast.push(this.parseTag());
      } else {
        throw new ParseError(`Unexpected token ${current.type}`, current.position);
      }
    }
    if (stopTypes.length > 0) {
        throw new ParseError(`Expected closing tag for ${stopTypes.join(" or ")}`, this.peek().position);
    }
    return ast;
  }

  private parseTag(): IfNode | EachNode | ExprNode | PartialNode {
    this.consume("open-tag", "Expected '{{'.");

    if (this.match("greater-than")) {
      return this.parsePartial();
    }
    
    if (this.match("hash")) {
      if (this.match("if")) return this.parseIf();
      if (this.match("each")) return this.parseEach();
      if (this.match("partial")) return this.parsePartialBlock();
      throw new ParseError("Unknown block tag after #", this.peek().position);
    }

    const expr = this.parseExpr();
    this.consume("close-tag", "Expected '}}' after expression.");
    return expr;
  }

  private parseIf(): IfNode {
    const condition = this.parseExpr();
    this.consume("close-tag", "Expected '}}' after if condition.");
    const thenBranch = this.parseUntil(["else", "slash"]);
    let otherwise: AST | undefined;

    if (this.peekNextType() === "else") {
      this.consume("open-tag", "Expected '{{'.");
      this.consume("else", "Expected 'else'.");
      this.consume("close-tag", "Expected '}}'.");
      otherwise = this.parseUntil(["slash"]);
    }

    this.consume("open-tag", "Expected '{{'.");
    this.consume("slash", "Expected '/'.");
    this.consume("if", "Expected 'if'.");
    this.consume("close-tag", "Expected '}}'.");
    
    return { kind: "if", condition, thenBranch, otherwise };
  }

  private parseEach(): EachNode {
    const items = this.parseExpr();
    this.consume("as", "Expected 'as' in each block.");
    this.consume("pipe", "Expected '|' after 'as'.");
    const asToken = this.consume("identifier", "Expected item name.");
    const as = isIdentifierToken(asToken) ? asToken.value : "";
    let index: string | undefined;
    if (this.match("comma")) {
      const indexToken = this.consume("identifier", "Expected index name.");
      index = isIdentifierToken(indexToken) ? indexToken.value : undefined;
    }
    this.consume("pipe", "Expected '|' to close item binding.");
    this.consume("close-tag", "Expected '}}' to close each block.");
    const body = this.parseUntil(["slash"]);
    this.consume("open-tag", "Expected '{{'.");
    this.consume("slash", "Expected '/'.");
    this.consume("each", "Expected 'each'.");
    this.consume("close-tag", "Expected '}}'.");
    return { kind: "each", items, as, index, body };
  }

  private parsePartial(): PartialNode {
    let name: string | ExprNode;
    if (this.match("open-paren")) {
      name = this.parseExpr();
      this.consume("close-paren", "Expected ')' after dynamic partial name.");
    } else if (this.match("identifier")) {
      const prev = this.previous();
      const path = [isIdentifierToken(prev) ? prev.value : ""];
      // Also handle dot-notation for partial names
      while (this.match("dot")) {
        const nextToken = this.consume("identifier", "Expected identifier.");
        path.push(isIdentifierToken(nextToken) ? nextToken.value : "");
      }
      name = path.join(".");
    } else {
      throw new ParseError("Expected a partial name or a dynamic expression.", this.peek().position);
    }
    this.consume("close-tag", "Expected '}}'.");
    return { kind: "partial", name };
  }

  private parsePartialBlock(): PartialNode {
    let name: string;
    if (this.match("identifier")) {
      const prev = this.previous();
      name = isIdentifierToken(prev) ? prev.value : "";
    } else {
      throw new ParseError("Expected a partial name.", this.peek().position);
    }
    
    const params: Record<string, ExprNode> = {};
    if (this.match("with")) {
      do {
        const paramToken = this.consume("identifier", "Expected parameter name.");
        const paramName = isIdentifierToken(paramToken) ? paramToken.value : "";
        this.consume("equals", "Expected '=' after parameter name.");
        const value = this.parseExpr();
        params[paramName] = value;
      } while (this.match("comma"));
    }
    
    this.consume("close-tag", "Expected '}}'.");
    return { kind: "partial", name, params: Object.keys(params).length > 0 ? params : undefined };
  }

  private parseExpr(): ExprNode {
    const firstToken = this.consume("identifier", "Expected identifier.");
    const path = [isIdentifierToken(firstToken) ? firstToken.value : ""];
    while (this.match("dot")) {
      const nextToken = this.consume("identifier", "Expected identifier.");
      path.push(isIdentifierToken(nextToken) ? nextToken.value : "");
    }
    const pipes: string[] = [];
    while (this.match("pipe")) {
      this.consume("greater-than", "Expected '>' after '|'.");
      const pipeToken = this.consume("identifier", "Expected pipe name.");
      pipes.push(isIdentifierToken(pipeToken) ? pipeToken.value : "");
    }
    return { kind: "expr", path, pipes };
  }

  private match(...types: Token["type"][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: Token["type"], message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek().position);
  }

  private check(type: Token["type"]): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  
  private peekNextType(): Token["type"] | null {
      return this.tokens[this.pos + 1]?.type ?? null;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: "eof", position: this.src.length };
  }

  private previous(): Token {
    return this.tokens[this.pos - 1] ?? { type: "eof", position: this.src.length };
  }
}

class ParseError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = "ParseError";
  }
}
