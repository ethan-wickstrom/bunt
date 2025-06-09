import { describe, it, expect } from "bun:test";
import { compile } from "./compiler";

// We'll access the private helper methods through compilation and test their outputs
describe("Compiler Helper Functions", () => {
  describe("compileTextNode", () => {
    it("should handle simple text", () => {
      const result = compile("Hello World");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain('"Hello World"');
      }
    });

    it("should handle text with special characters", () => {
      const result = compile('Text with "quotes" and \'apostrophes\'');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain('Text with \\"quotes\\" and \'apostrophes\'');
      }
    });

    it("should handle text with newlines and tabs", () => {
      const result = compile("Line 1\nLine 2\tTabbed");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain('Line 1\\nLine 2\\tTabbed');
      }
    });

    it("should handle empty text", () => {
      const result = compile("");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain('return ""');
      }
    });
  });

  describe("compileExprNode", () => {
    it("should handle simple property access", () => {
      const result = compile("{{name}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("ctx.name");
        expect(result.value.source).toContain("!== undefined && ctx.name !== null");
      }
    });

    it("should handle nested property access", () => {
      const result = compile("{{user.profile.name}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("ctx.user.profile.name");
      }
    });

    it("should handle expressions with pipes", () => {
      const result = compile("{{name |> upper}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("helpers.upper(ctx.name");
      }
    });

    it("should handle expressions with multiple pipes", () => {
      const result = compile("{{name |> lower |> capitalize}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("helpers.capitalize(helpers.lower(ctx.name");
      }
    });

    it("should handle helper functions without context", () => {
      const result = compile("{{upper}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("helpers.upper");
      }
    });
  });

  describe("compileIfNode", () => {
    it("should handle simple if conditions", () => {
      const result = compile("{{#if isVisible}}Visible{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.isVisible ? \"Visible\" : \"\")");
      }
    });

    it("should handle if-else conditions", () => {
      const result = compile("{{#if isLoggedIn}}Welcome{{else}}Please log in{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.isLoggedIn ? \"Welcome\" : \"Please log in\")");
      }
    });

    it("should handle nested if conditions", () => {
      const result = compile("{{#if user}}{{#if user.isAdmin}}Admin{{/if}}{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.user ? (ctx.user.isAdmin ? \"Admin\" : \"\") : \"\")");
      }
    });

    it("should handle complex conditions with expressions", () => {
      const result = compile("{{#if user.permissions.canEdit}}{{content}}{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("ctx.user.permissions.canEdit");
        expect(result.value.source).toContain("ctx.content");
      }
    });

    it("should handle conditions with piped expressions", () => {
      const result = compile("{{#if status |> upper}}Active{{/if}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("helpers.upper(ctx.status)");
      }
    });
  });

  describe("compileEachNode", () => {
    it("should handle simple loops", () => {
      const result = compile("{{#each items as |item|}}{{item}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.items || []).map((item) =>");
        expect(result.value.source).toContain("item !== undefined && item !== null ? item");
      }
    });

    it("should handle loops with index", () => {
      const result = compile("{{#each users as |user, index|}}{{index}}: {{user.name}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.users || []).map((user, index) =>");
        expect(result.value.source).toContain("user.name");
      }
    });

    it("should handle nested loops", () => {
      const result = compile("{{#each groups as |group|}}{{#each group.items as |item|}}{{item}}{{/each}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.groups || []).map((group) =>");
        expect(result.value.source).toContain("(group.items || []).map((item) =>");
      }
    });

    it("should handle loops with complex expressions", () => {
      const result = compile("{{#each users as |user|}}{{user.name |> upper}} - {{user.email}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("helpers.upper(user.name");
        expect(result.value.source).toContain("user.email");
      }
    });

    it("should handle loops with conditionals inside", () => {
      const result = compile("{{#each users as |user|}}{{#if user.isActive}}{{user.name}}{{/if}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(user.isActive ? helpers.escapeHtml((user.name !== undefined && user.name !== null ? user.name");
      }
    });

    it("should handle empty array edge case", () => {
      const result = compile("{{#each emptyArray as |item|}}{{item}}{{/each}}");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.emptyArray || [])");
      }
    });
  });

  describe("Integration: Combined Helper Functions", () => {
    it("should handle complex template with all node types", () => {
      const template = `
        Hello {{user.name |> capitalize}}!
        {{#if user.posts}}
          Your posts:
          {{#each user.posts as |post, index|}}
            {{index}}. {{post.title}}
            {{#if post.isPublished}}
              (Published)
            {{else}}
              (Draft)
            {{/if}}
          {{/each}}
        {{else}}
          You have no posts yet.
        {{/if}}
      `;
      
      const result = compile(template);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should contain all helper function outputs
        expect(result.value.source).toContain("helpers.capitalize(ctx.user.name");
        expect(result.value.source).toContain("(ctx.user.posts ?");
        expect(result.value.source).toContain("(ctx.user.posts || []).map((post, index) =>");
        expect(result.value.source).toContain("(post.isPublished ? \"\\n              (Published)\\n            \" : \"\\n              (Draft)\\n            \")");
      }
    });

    it("should handle deeply nested structures", () => {
      const template = `
        {{#each categories as |category|}}
          {{category.name}}:
          {{#each category.items as |item|}}
            {{#if item.isAvailable}}
              {{item.name}} - {{item.price |> currency}}
            {{/if}}
          {{/each}}
        {{/each}}
      `;
      
      const result = compile(template);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.source).toContain("(ctx.categories || []).map((category) =>");
        expect(result.value.source).toContain("(category.items || []).map((item) =>");
        expect(result.value.source).toContain("(item.isAvailable ?");
        expect(result.value.source).toContain("helpers.currency(item.price");
      }
    });
  });
});
