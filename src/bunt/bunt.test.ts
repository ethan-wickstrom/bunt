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

    it("should handle pipes", () => {
        const res = compile("{{ name |> upper }}");
        expect(res.isOk()).toBe(true);
        if (res.isOk()) {
            expect(res.value.source).toContain("helpers.upper(ctx.name)");
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

    it("should render loops", async () => {
      const tpl = "{{#each users as |user|}}{{user.name}}, {{/each}}";
      const output = await render(tpl, { users: [{ name: "Alice" }, { name: "Bob" }] });
      expect(output).toBe("Alice, Bob, ");
    });

    it("should render loops with an index", async () => {
        const tpl = "{{#each users as |user, i|}}{{i}}:{{user.name}} {{/each}}";
        const output = await render(tpl, { users: [{ name: "Alice" }, { name: "Bob" }] });
        expect(output).toBe("0:Alice 1:Bob ");
    });

    it("should use pipe helpers", async () => {
        const output = await render("{{ name |> upper }}", { name: "cline" });
        expect(output).toBe("CLINE");
    });

    it("should throw an error for missing values", async () => {
        let didThrow = false;
        try {
            await render("{{name}}", {});
        } catch (e) {
            didThrow = true;
            expect((e as Error).message).toContain("Missing `name`");
        }
        expect(didThrow).toBe(true);
    });
  });
});
