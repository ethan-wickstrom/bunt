// A tiny, immutable builder for JS-string codegen.
export class CodeBuilder {
  private readonly parts: string[];

  constructor(parts: string[] = []) {
    this.parts = parts;
  }

  /** Append one piece of generated code. */
  public add(code: string): CodeBuilder {
    return new CodeBuilder([...this.parts, code]);
  }

  /** Render with " + " between each part, or a literal empty string. */
  public build(): string {
    if (this.parts.length === 0) return '""';
    return this.parts.join(" + ");
  }
}
