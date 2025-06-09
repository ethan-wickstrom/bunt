import type { AST, ExprNode, IfNode, EachNode, Token } from "./types";
import { TokenType } from "./types";
import { type Result, ok, err } from "neverthrow";

export function parse(
  src: string
): Result<AST, { message: string; position: number }> {
  try {
    const tokens = new Tokenizer(src).tokenize();
    const parser = new Parser(tokens, src);
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

  private parseUntil(stopTypes: TokenType[] = []): AST {
    const ast: AST = [];
    while (!this.isAtEnd()) {
      if (this.peek().type === TokenType.Text) {
        ast.push({ kind: "text", text: this.advance().value });
      } else if (this.peek().type === TokenType.OpenTag) {
        const nextToken = this.tokens[this.pos + 1];
        if (nextToken && stopTypes.includes(nextToken.type)) {
          return ast;
        }
        ast.push(this.parseTag());
      } else {
        throw new ParseError(`Unexpected token ${this.peek().type}`, this.peek().position);
      }
    }
    if (stopTypes.length > 0) {
        throw new ParseError(`Expected closing tag for ${stopTypes.join(" or ")}`, this.pos);
    }
    return ast;
  }

  private parseTag(): IfNode | EachNode | ExprNode {
    this.consume(TokenType.OpenTag, "Expected '{{'.");
    
    if (this.match(TokenType.Hash)) {
      if (this.match(TokenType.If)) return this.parseIf();
      if (this.match(TokenType.Each)) return this.parseEach();
      throw new ParseError("Unknown block tag after #", this.peek().position);
    }

    const expr = this.parseExpr();
    this.consume(TokenType.CloseTag, "Expected '}}' after expression.");
    return expr;
  }

  private parseIf(): IfNode {
    const condition = this.parseExpr();
    this.consume(TokenType.CloseTag, "Expected '}}' after if condition.");
    const thenBranch = this.parseUntil([TokenType.Else, TokenType.Slash]);
    let otherwise: AST | undefined;

    if (this.peekNextType() === TokenType.Else) {
      this.consume(TokenType.OpenTag, "Expected '{{'.");
      this.consume(TokenType.Else, "Expected 'else'.");
      this.consume(TokenType.CloseTag, "Expected '}}'.");
      otherwise = this.parseUntil([TokenType.Slash]);
    }

    this.consume(TokenType.OpenTag, "Expected '{{'.");
    this.consume(TokenType.Slash, "Expected '/'.");
    this.consume(TokenType.If, "Expected 'if'.");
    this.consume(TokenType.CloseTag, "Expected '}}'.");
    
    return { kind: "if", condition, thenBranch, otherwise };
  }

  private parseEach(): EachNode {
    const items = this.parseExpr();
    this.consume(TokenType.As, "Expected 'as' in each block.");
    this.consume(TokenType.Pipe, "Expected '|' after 'as'.");
    const as = this.consume(TokenType.Identifier, "Expected item name.").value;
    let index: string | undefined;
    if (this.match(TokenType.Comma)) {
      index = this.consume(TokenType.Identifier, "Expected index name.").value;
    }
    this.consume(TokenType.Pipe, "Expected '|' to close item binding.");
    this.consume(TokenType.CloseTag, "Expected '}}' to close each block.");
    const body = this.parseUntil([TokenType.Slash]);
    this.consume(TokenType.OpenTag, "Expected '{{'.");
    this.consume(TokenType.Slash, "Expected '/'.");
    this.consume(TokenType.Each, "Expected 'each'.");
    this.consume(TokenType.CloseTag, "Expected '}}'.");
    return { kind: "each", items, as, index, body };
  }

  private parseExpr(): ExprNode {
    const path = [this.consume(TokenType.Identifier, "Expected identifier.").value];
    while (this.match(TokenType.Dot)) {
      path.push(this.consume(TokenType.Identifier, "Expected identifier.").value);
    }
    const pipes: string[] = [];
    while (this.match(TokenType.Pipe)) {
      this.consume(TokenType.GreaterThan, "Expected '>' after '|'.");
      pipes.push(this.consume(TokenType.Identifier, "Expected pipe name.").value);
    }
    return { kind: "expr", raw: "", path, pipes };
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek().position);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }
  
  private peekNextType(): TokenType | null {
      return this.tokens[this.pos + 1]?.type ?? null;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: "", position: this.src.length };
  }

  private previous(): Token {
    return this.tokens[this.pos - 1] ?? { type: TokenType.EOF, value: "", position: this.src.length };
  }
}

class Tokenizer {
  private readonly src: string;
  private readonly tokens: Token[] = [];
  private pos = 0;

  constructor(src: string) {
    this.src = src;
  }

  public tokenize(): Token[] {
    while (this.pos < this.src.length) {
      if (this.src.slice(this.pos).startsWith("{{")) {
        this.scanTag();
      } else {
        this.scanText();
      }
    }
    this.addToken(TokenType.EOF, "");
    return this.tokens;
  }

  private scanText() {
    const end = this.src.indexOf("{{", this.pos);
    const text = this.src.slice(this.pos, end === -1 ? this.src.length : end);
    if (text) {
      this.addToken(TokenType.Text, text);
    }
    this.pos = end === -1 ? this.src.length : end;
  }

  private scanTag() {
    this.addToken(TokenType.OpenTag, "{{");
    this.pos += 2;
    while (this.pos < this.src.length) {
      if (this.src.slice(this.pos).startsWith("}}")) {
        this.pos += 2;
        this.addToken(TokenType.CloseTag, "}}");
        return;
      }
      const char = this.src[this.pos];
      if (char === undefined) {
        throw new ParseError("Unclosed tag", this.pos);
      }
      if (/\s/.test(char)) {
        this.pos++;
        continue;
      }
      switch (char) {
        case "|": this.addToken(TokenType.Pipe, "|"); this.pos++; break;
        case ".": this.addToken(TokenType.Dot, "."); this.pos++; break;
        case ",": this.addToken(TokenType.Comma, ","); this.pos++; break;
        case ">": this.addToken(TokenType.GreaterThan, ">"); this.pos++; break;
        case "/": {
          this.addToken(TokenType.Slash, "/");
          this.pos++;
          // After '/', scan for 'if' or 'each' as a keyword
          const nextChar = this.src[this.pos];
          if (nextChar && /[a-zA-Z]/.test(nextChar)) {
            this.scanKeyword();
          }
          break;
        }
        case "#":
          this.addToken(TokenType.Hash, "#");
          this.pos++;
          this.scanKeyword();
          break;
        default:
          if (/[a-zA-Z_]/.test(char)) {
            this.scanIdentifier();
          } else {
            throw new ParseError(`Unexpected character: ${char}`, this.pos++);
          }
      }
    }
  }

  private scanKeyword() {
    const start = this.pos;
    while (/[a-zA-Z]/.test(this.peekChar())) this.pos++;
    const text = this.src.slice(start, this.pos);
    switch (text) {
      case "if": this.addToken(TokenType.If, text); break;
      case "each": this.addToken(TokenType.Each, text); break;
      default: throw new ParseError(`Unknown keyword #${text}`, start);
    }
  }

  private scanIdentifier() {
    const start = this.pos;
    while (/[a-zA-Z0-9_]/.test(this.peekChar())) this.pos++;
    const text = this.src.slice(start, this.pos);
    switch (text) {
      case "else": this.addToken(TokenType.Else, text); break;
      case "as": this.addToken(TokenType.As, text); break;
      default: this.addToken(TokenType.Identifier, text);
    }
  }

  private addToken(type: TokenType, value: string) {
    this.tokens.push({ type, value, position: this.pos });
  }

  private peekChar(): string {
    if (this.pos >= this.src.length) return "\0";
    return this.src[this.pos] ?? "\0";
  }
}

class ParseError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = "ParseError";
  }
}
