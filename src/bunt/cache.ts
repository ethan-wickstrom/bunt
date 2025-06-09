import type { Ctx } from "./types";

export type RenderFn = (ctx: Ctx) => string;

class TemplateCache {
  private readonly max = 128;
  private readonly cache = new Map<string, RenderFn>();

  public get(key: string): RenderFn | undefined {
    const fn = this.cache.get(key);
    if (!fn) return undefined;
    // Refresh LRU
    this.cache.delete(key);
    this.cache.set(key, fn);
    return fn;
  }

  public set(key: string, fn: RenderFn): void {
    if (this.cache.size >= this.max) {
      // Remove oldest
      const [oldest] = this.cache.keys();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, fn);
  }
}

export const templateCache = new TemplateCache();
