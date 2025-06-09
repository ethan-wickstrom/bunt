import { describe, it, expect } from "bun:test";
import { tokenize, Token } from "./tokenizer";

describe("Tokenizer", () => {
  describe("Basic tokenization", () => {
    it("should tokenize empty string", () => {
      const result = tokenize("");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([Token.eof(0)]);
      }
    });

    it("should tokenize plain text", () => {
      const result = tokenize("Hello World");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.text("Hello World", 0),
          Token.eof(11),
        ]);
      }
    });

    it("should tokenize simple expression", () => {
      const result = tokenize("{{name}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("name", 2),
          Token.closeTag(6),
          Token.eof(8),
        ]);
      }
    });

    it("should tokenize text with expression", () => {
      const result = tokenize("Hello {{name}}!");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.text("Hello ", 0),
          Token.openTag(6),
          Token.identifier("name", 8),
          Token.closeTag(12),
          Token.text("!", 14),
          Token.eof(15),
        ]);
      }
    });
  });

  describe("Complex expressions", () => {
    it("should tokenize dot notation", () => {
      const result = tokenize("{{user.name}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("user", 2),
          Token.dot(6),
          Token.identifier("name", 7),
          Token.closeTag(11),
          Token.eof(13),
        ]);
      }
    });

    it("should tokenize nested dot notation", () => {
      const result = tokenize("{{user.profile.name}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("user", 2),
          Token.dot(6),
          Token.identifier("profile", 7),
          Token.dot(14),
          Token.identifier("name", 15),
          Token.closeTag(19),
          Token.eof(21),
        ]);
      }
    });

    it("should tokenize pipes", () => {
      const result = tokenize("{{name |> upper}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("name", 2),
          Token.pipe(7),
          Token.greaterThan(8),
          Token.identifier("upper", 10),
          Token.closeTag(15),
          Token.eof(17),
        ]);
      }
    });

    it("should tokenize multiple pipes", () => {
      const result = tokenize("{{name |> lower |> capitalize}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("name", 2),
          Token.pipe(7),
          Token.greaterThan(8),
          Token.identifier("lower", 10),
          Token.pipe(16),
          Token.greaterThan(17),
          Token.identifier("capitalize", 19),
          Token.closeTag(29),
          Token.eof(31),
        ]);
      }
    });
  });

  describe("Control structures", () => {
    it("should tokenize if statement", () => {
      const result = tokenize("{{#if isTrue}}content{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.hash(2),
          Token.if(3),
          Token.identifier("isTrue", 6),
          Token.closeTag(12),
          Token.text("content", 14),
          Token.openTag(21),
          Token.slash(23),
          Token.if(24),
          Token.closeTag(26),
          Token.eof(28),
        ]);
      }
    });

    it("should tokenize if-else statement", () => {
      const result = tokenize("{{#if isTrue}}yes{{else}}no{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.hash(2),
          Token.if(3),
          Token.identifier("isTrue", 6),
          Token.closeTag(12),
          Token.text("yes", 14),
          Token.openTag(17),
          Token.else(19),
          Token.closeTag(23),
          Token.text("no", 25),
          Token.openTag(27),
          Token.slash(29),
          Token.if(30),
          Token.closeTag(32),
          Token.eof(34),
        ]);
      }
    });

    it("should tokenize each loop", () => {
      const result = tokenize("{{#each items as |item|}}{{item}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.hash(2),
          Token.each(3),
          Token.identifier("items", 8),
          Token.as(14),
          Token.pipe(17),
          Token.identifier("item", 18),
          Token.pipe(22),
          Token.closeTag(23),
          Token.openTag(25),
          Token.identifier("item", 27),
          Token.closeTag(31),
          Token.openTag(33),
          Token.slash(35),
          Token.each(36),
          Token.closeTag(40),
          Token.eof(42),
        ]);
      }
    });

    it("should tokenize each loop with index", () => {
      const result = tokenize("{{#each items as |item, index|}}{{index}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.hash(2),
          Token.each(3),
          Token.identifier("items", 8),
          Token.as(14),
          Token.pipe(17),
          Token.identifier("item", 18),
          Token.comma(22),
          Token.identifier("index", 24),
          Token.pipe(29),
          Token.closeTag(30),
          Token.openTag(32),
          Token.identifier("index", 34),
          Token.closeTag(39),
          Token.openTag(41),
          Token.slash(43),
          Token.each(44),
          Token.closeTag(48),
          Token.eof(50),
        ]);
      }
    });
  });

  describe("Whitespace handling", () => {
    it("should handle whitespace in expressions", () => {
      const result = tokenize("{{  name  }}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("name", 4),
          Token.closeTag(10),
          Token.eof(12),
        ]);
      }
    });

    it("should handle newlines in expressions", () => {
      const result = tokenize("{{\n  name\n}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("name", 5),
          Token.closeTag(10),
          Token.eof(12),
        ]);
      }
    });
  });

  describe("Error handling", () => {
    it("should error on unclosed tag", () => {
      const result = tokenize("{{name");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("unclosed-tag");
        expect(result.error.message).toBe("Expected '}}' after expression.");
        expect(result.error.position).toBe(0);
      }
    });

    it("should error on unexpected character", () => {
      const result = tokenize("{{@}}");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("unexpected-character");
        expect(result.error.message).toBe("Unexpected character: @");
        expect(result.error.position).toBe(2);
      }
    });

    it("should error on unknown keyword", () => {
      const result = tokenize("{{#unknown}}");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe("unknown-keyword");
        expect(result.error.message).toBe("Unknown keyword #unknown");
        expect(result.error.position).toBe(3);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle multiple consecutive tags", () => {
      const result = tokenize("{{a}}{{b}}{{c}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.identifier("a", 2),
          Token.closeTag(3),
          Token.openTag(5),
          Token.identifier("b", 7),
          Token.closeTag(8),
          Token.openTag(10),
          Token.identifier("c", 12),
          Token.closeTag(13),
          Token.eof(15),
        ]);
      }
    });

    it("should handle empty expressions", () => {
      const result = tokenize("{{}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.openTag(0),
          Token.closeTag(2),
          Token.eof(4),
        ]);
      }
    });

    it("should handle text with special characters", () => {
      const result = tokenize('Text with "quotes" and \'apostrophes\'');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([
          Token.text('Text with "quotes" and \'apostrophes\'', 0),
          Token.eof(36),
        ]);
      }
    });
  });

  describe("Position tracking", () => {
    it("should track positions correctly", () => {
      const result = tokenize("Hello {{name}}, welcome!");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const positions = result.value.map(t => t.position);
        expect(positions).toEqual([0, 6, 8, 12, 14, 24]);
      }
    });

    it("should track positions with multi-byte characters", () => {
      const result = tokenize("Hello 👋 {{name}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Note: positions are byte offsets, not character offsets
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0]?.position).toBe(0);
        expect(result.value.length).toBeGreaterThan(1);
        expect(result.value[1]?.position).toBe(9); // "Hello 👋 " is 9 bytes
      }
    });
  });
});