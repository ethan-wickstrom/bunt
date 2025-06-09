import { describe, it, expect } from "bun:test";
import { compile } from "./compiler";
import { render } from "./runtime";

describe("Bunt Templating Engine", () => {
  describe("Compiler", () => {
    it("should compile a simple template", () => {
      const res = compile("Hello, {{name}}!");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain("export function render_Template");
        expect(res.value.source).toContain('return "Hello, " + (ctx.name');
      }
    });

    it("should handle conditionals", () => {
      const res = compile("{{#if user.isLoggedIn}}Welcome, {{user.name}}{{/if}}");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain('ctx.user.isLoggedIn ? "Welcome, "');
      }
    });

    it("should handle conditionals with an else block", () => {
      const res = compile("{{#if user.isLoggedIn}}Welcome, {{user.name}}{{else}}Please log in.{{/if}}");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain('? "Welcome, "');
        expect(res.value.source).toContain(': "Please log in."');
      }
    });

    it("should handle nested conditionals", () => {
      const res = compile("{{#if a}}{{#if b}}inner{{/if}}{{/if}}");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain('(ctx.a ? (ctx.b ? "inner" : "") : "")');
      }
    });

    it("should handle loops", () => {
      const res = compile("{{#each users as |user|}}{{user.name}}{{/each}}");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain('(ctx.users || []).map((user) =>');
      }
    });

    it("should handle loops with an index", () => {
      const res = compile("{{#each users as |user, i|}}{{i}}: {{user.name}}{{/each}}");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain('(ctx.users || []).map((user, i) =>');
      }
    });

    it("should handle nested loops", () => {
      const res = compile("{{#each items as |item|}}{{#each item.sub as |sub|}}{{sub}}{{/each}}{{/each}}");
      expect(res.isOk()).toBe(true);
      if (res.isOk()) {
        expect(res.value.source).toContain('(ctx.items || []).map((item) => (item.sub || []).map((sub) => (sub');
      }
    });

    it("should handle pipes", () => {
        const res = compile("{{ name |> upper }}");
        expect(res.isOk()).toBe(true);
        if (res.isOk()) {
            expect(res.value.source).toContain("helpers.upper(ctx.name)");
        }
    });

    it("should handle multiple pipes", () => {
        const res = compile("{{ name |> lower |> capitalize }}");
        expect(res.isOk()).toBe(true);
        if (res.isOk()) {
            expect(res.value.source).toContain("helpers.capitalize(helpers.lower(ctx.name))");
        }
    });

    it("should handle html escaping", () => {
        const res = compile("{{ content |> escapeHtml }}");
        expect(res.isOk()).toBe(true);
        if (res.isOk()) {
            expect(res.value.source).toContain("helpers.escapeHtml(ctx.content)");
        }
    });

    it("should return an error for unclosed tags", () => {
      const res = compile("Hello, {{name");
      expect(res.isErr()).toBe(true);
      if (res.isErr()) {
        expect(res.error.message).toContain("Expected '}}' after expression.");
      }
    });
  });

  describe("Runtime", () => {
    it("should render a simple template", async () => {
      const output = await render("Hello, {{name}}!", { name: "World" });
      expect(output).toBe("Hello, World!");
    });

    it("should render conditionals", async () => {
      const tpl = "{{#if user.isLoggedIn}}Welcome, {{user.name}}{{else}}Please log in.{{/if}}";
      const output1 = await render(tpl, { user: { isLoggedIn: true, name: "Cline" } });
      expect(output1).toBe("Welcome, Cline");
      const output2 = await render(tpl, { user: { isLoggedIn: false } });
      expect(output2).toBe("Please log in.");
    });

    it("should render nested conditionals", async () => {
      const tpl = "{{#if a}}A{{#if b}}B{{/if}}{{else}}C{{/if}}";
      const output1 = await render(tpl, { a: true, b: true });
      expect(output1).toBe("AB");
      const output2 = await render(tpl, { a: true, b: false });
      expect(output2).toBe("A");
      const output3 = await render(tpl, { a: false, b: true });
      expect(output3).toBe("C");
    });

    it("should render loops", async () => {
      const tpl = "{{#each users as |user|}}{{user.name}}, {{/each}}";
      const output = await render(tpl, { users: [{ name: "Alice" }, { name: "Bob" }] });
      expect(output).toBe("Alice, Bob, ");
    });

    it("should render an empty string for loops with empty arrays", async () => {
      const tpl = "{{#each users as |user|}}{{user.name}}, {{/each}}";
      const output = await render(tpl, { users: [] });
      expect(output).toBe("");
    });

    it("should render nested loops", async () => {
      const tpl = "{{#each items as |item|}}[{{#each item.sub as |s|}}{{s}},{{/each}}]{{/each}}";
      const data = {
        items: [
          { sub: [1, 2] },
          { sub: [3, 4] },
        ],
      };
      const output = await render(tpl, data);
      expect(output).toBe("[1,2,][3,4,]");
    });

    it("should render loops with an index", async () => {
        const tpl = "{{#each users as |user, i|}}{{i}}:{{user.name}} {{/each}}";
        const output = await render(tpl, { users: [{ name: "Alice" }, { name: "Bob" }] });
        expect(output).toBe("0:Alice 1:Bob ");
    });

    it("should throw an error for 'each' over a non-array", async () => {
        const tpl = "{{#each users as |user|}}{{user.name}}, {{/each}}";
        let didThrow = false;
        try {
            await render(tpl, { users: { not: "an array" } });
        } catch (e) {
            didThrow = true;
            expect(e).toBeInstanceOf(TypeError);
            expect((e as Error).message).toContain(".map is not a function");
        }
        expect(didThrow).toBe(true);
    });

    it("should use pipe helpers", async () => {
        const output = await render("{{ name |> upper }}", { name: "cline" });
        expect(output).toBe("CLINE");
    });

    it("should use multiple pipe helpers", async () => {
        const output = await render("{{ name |> lower |> capitalize }}", { name: "CLINE" });
        expect(output).toBe("Cline");
    });

    it("should escape html", async () => {
        const output = await render("{{ content |> escapeHtml }}", { content: "<script>alert('xss')</script>" });
        expect(output).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    });

    it("should use various standard helpers", async () => {
        const tpl = '{{ a |> lower }}, {{ b |> capitalize }}, {{ c |> truncate }}, {{ d |> json }}, {{ e |> date }}';
        const date = new Date("2024-01-15T12:00:00.000Z");
        const data = { a: "HELLO", b: "world", c: "1234567890123456789012345", d: { x: 1 }, e: date };
        const output = await render(tpl, data);
        expect(output).toBe(`hello, World, 12345678901234567890..., {"x":1}, ${date.toLocaleDateString()}`);
    });

    it("should allow custom helpers", async () => {
        const tpl = "{{ name |> exclaim }}";
        const data = {
            name: "World",
            exclaim: (s: string) => `${s}!!!`,
        };
        const output = await render(tpl, data);
        expect(output).toBe("World!!!");
    });

    it("should throw an error for missing values", async () => {
        let didThrow = false;
        try {
            await render("{{name}}", {});
        } catch (e) {
            didThrow = true;
            expect((e as Error).message).toContain("Missing name");
        }
        expect(didThrow).toBe(true);
    });

    it("should throw an error for unknown pipes", async () => {
        let didThrow = false;
        try {
            await render("{{ name |> foobar }}", { name: "test" });
        } catch (e) {
            didThrow = true;
            expect(e).toBeInstanceOf(TypeError);
            expect((e as Error).message).toContain("is not a function");
        }
        expect(didThrow).toBe(true);
    });
  });
});