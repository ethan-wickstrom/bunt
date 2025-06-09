import { Glob } from "bun";
import type { RenderOptions, PartialResolver } from "./types";

export class PartialRegistry {
  private readonly cache = new Map<string, string>();
  private readonly resolver?: PartialResolver;

  constructor(resolver?: PartialResolver) {
    this.resolver = resolver;
  }

  public async register(name: string, template: string): Promise<void> {
    this.cache.set(name, template);
  }

  public async registerDirectory(dir: string): Promise<void> {
    const glob = new Glob("**/*.bnt");
    for await (const file of glob.scan(dir)) {
      const content = await Bun.file(`${dir}/${file}`).text();
      const name = file.replace(/\.bnt$/, "").replace(/\//g, ".");
      await this.register(name, content);
    }
  }

  public async resolve(name: string): Promise<string | undefined> {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    
    if (this.resolver) {
      const template = await this.resolver(name);
      if (template) {
        this.cache.set(name, template);
        return template;
      }
    }
    
    return undefined;
  }

  public toOptions(): RenderOptions {
    return {
      partials: Object.fromEntries(this.cache),
      partialResolver: this.resolver
    };
  }
}
