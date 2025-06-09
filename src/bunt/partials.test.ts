import { expect, test, describe } from "bun:test";
import { render } from "./runtime";
import { PartialRegistry } from "./partials";
import { $ } from "bun";

describe("Bunt Partials", () => {
  test("should render a simple partial", async () => {
    const mainTpl = "Hello, {{> world }}!";
    const partialTpl = "World";
    const registry = new PartialRegistry();
    await registry.register("world", partialTpl);
    const output = await render(mainTpl, {}, registry.toOptions());
    expect(output).toBe("Hello, World!");
  });

  test("should render a partial with context", async () => {
    const mainTpl = '{{#partial userCard with user=user}}';
    const partialTpl = "Name: {{user.name}}";
    const registry = new PartialRegistry();
    await registry.register("userCard", partialTpl);
    const output = await render(mainTpl, { user: { name: "Alice" } }, registry.toOptions());
    expect(output).toBe("Name: Alice");
  });

  test("should handle nested partials", async () => {
    const mainTpl = '{{> A }}';
    const partialA = "A contains {{> B }}";
    const partialB = "B";
    const registry = new PartialRegistry();
    await registry.register("A", partialA);
    await registry.register("B", partialB);
    const output = await render(mainTpl, {}, registry.toOptions());
    expect(output).toBe("A contains B");
  });

  test("should handle dynamic partial names", async () => {
    const mainTpl = '{{> (partialName) }}';
    const partial1 = "Partial One";
    const partial2 = "Partial Two";
    const registry = new PartialRegistry();
    await registry.register("p1", partial1);
    await registry.register("p2", partial2);
    const output1 = await render(mainTpl, { partialName: "p1" }, registry.toOptions());
    const output2 = await render(mainTpl, { partialName: "p2" }, registry.toOptions());
    expect(output1).toBe("Partial One");
    expect(output2).toBe("Partial Two");
  });

  test("should throw an error for a missing partial", async () => {
    const mainTpl = "{{> missing }}";
    const registry = new PartialRegistry();
    await expect(render(mainTpl, {}, registry.toOptions())).rejects.toThrow("Partial 'missing' not found or is not a string.");
  });

  test("should load partials from a directory", async () => {
    // Create dummy files for testing
    await Bun.write("./test_partials/user/card.bnt", "User: {{name}}");
    await Bun.write("./test_partials/footer.bnt", "Copyright 2025");

    const registry = new PartialRegistry();
    await registry.registerDirectory("./test_partials");

    const mainTpl = "<div>{{> user.card }} - {{> footer }}</div>";
    const output = await render(mainTpl, { name: "Bob" }, registry.toOptions());
    expect(output).toBe("<div>User: Bob - Copyright 2025</div>");

    // Cleanup
    await new Promise((resolve) => setTimeout(resolve, 100)); // Brief pause
    await $`rm -rf ./test_partials`;
  });
});
