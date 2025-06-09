import { describe, it, expect, beforeAll } from "bun:test";
import { buntPlugin } from ".";
import type { TemplateFn } from "./types";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const outdir = join(import.meta.dir, "test-build");

type BasicProps = {
  name: string;
  html: string;
  items: string[];
  show: boolean;
};

// This will be our dynamically imported render function
let render: TemplateFn<BasicProps>;

beforeAll(async () => {
  // Clean up previous builds
  await rm(outdir, { recursive: true, force: true });

  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "test-templates/basic.bunt")],
    outdir,
    plugins: [buntPlugin],
    naming: "[dir]/[name].js",
  });

  if (!result.success) {
    console.error(result.logs);
    throw new Error("Build failed");
  }

  // Dynamically import the compiled module
  const modulePath = join(outdir, "basic.js");
  const module = await import(modulePath);
  render = module.render;
});

describe("bunt", () => {
  it("should render a template with all features", () => {
    const props: BasicProps = {
      name: "World",
      html: "<strong>raw</strong>",
      items: ["one", "two"],
      show: true,
    };

    const result = render(props);

    expect(result.isOk()).toBe(true);
    const output = result._unsafeUnwrap();

    expect(output).toContain("Hello, World!");
    expect(output).toContain("<strong>raw</strong>");
    expect(output).toContain("<li>one</li>");
    expect(output).toContain("<li>two</li>");
    expect(output).not.toContain("Nothing to see here.");
  });

  it("should handle conditional logic correctly", () => {
    const props: BasicProps = {
      name: "World",
      html: "<strong>raw</strong>",
      items: ["one", "two"],
      show: false,
    };

    const result = render(props);
    expect(result.isOk()).toBe(true);
    const output = result._unsafeUnwrap();

    expect(output).not.toContain("<ul>");
    expect(output).toContain("<p>Nothing to see here.</p>");
  });

  it("should escape HTML correctly", async () => {
    const template = `---
type Props = { html: string };
---
<%= props.html %>`;
    const templatePath = join(outdir, "escape-test.bunt");
    await Bun.write(templatePath, template);

    const buildResult = await Bun.build({
        entrypoints: [templatePath],
        outdir: join(outdir, "escape-build"),
        plugins: [buntPlugin],
        naming: "[name].js",
        root: outdir,
    });

    if (!buildResult.success) {
        console.error(buildResult.logs);
        throw new Error("Build failed for escape test");
    }

    const modulePath = join(outdir, "escape-build/escape-test.js");
    const module = await import(modulePath);
    const renderFn = module.render as TemplateFn<{html: string}>;
    const result = renderFn({ html: "<h1>Hello</h1>" });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("<h1>Hello</h1>");
  });
});
