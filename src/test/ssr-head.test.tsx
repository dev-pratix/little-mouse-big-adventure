import { describe, expect, it } from "vitest";
import { resolveSiteUrl, getSeoMeta, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";
import { Route as rootRoute } from "@/routes/__root";
import { Route as indexRoute } from "@/routes/index";

describe("Metadata and SEO Resolution Audit", () => {
  it("resolves clean site URLs from environment variables", () => {
    const originalEnv = process.env;

    try {
      // Test 1: VITE_SITE_URL
      process.env = { ...originalEnv, VITE_SITE_URL: "https://custom-domain.com/" };
      expect(resolveSiteUrl()).toBe("https://custom-domain.com");

      // Test 2: SITE_URL without protocol
      process.env = { ...originalEnv, SITE_URL: "game.mouseadventure.io" };
      expect(resolveSiteUrl()).toBe("https://game.mouseadventure.io");

      // Test 3: Vercel system production URL
      process.env = { ...originalEnv, VERCEL_PROJECT_PRODUCTION_URL: "little-mouse-big-adventure.vercel.app" };
      expect(resolveSiteUrl()).toBe("https://little-mouse-big-adventure.vercel.app");

      // Test 4: Vercel preview deployment URL
      process.env = { ...originalEnv, VERCEL_URL: "little-mouse-git-feat.vercel.app" };
      expect(resolveSiteUrl()).toBe("https://little-mouse-git-feat.vercel.app");

      // Test 5: Fallback when empty
      process.env = { ...originalEnv };
      delete process.env.VITE_SITE_URL;
      delete process.env.SITE_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;
      expect(resolveSiteUrl()).toBe("");
    } finally {
      process.env = originalEnv;
    }
  });

  it("ensures OG and Twitter images resolve to absolute HTTPS URL when production domain is known", () => {
    const originalEnv = process.env;
    try {
      process.env = { ...originalEnv, VERCEL_PROJECT_PRODUCTION_URL: "little-mouse.vercel.app" };
      const meta = getSeoMeta();

      const ogImage = meta.find((m) => m.property === "og:image");
      const twitterImage = meta.find((m) => m.name === "twitter:image");
      const ogUrl = meta.find((m) => m.property === "og:url");

      expect(ogImage?.content).toBe("https://little-mouse.vercel.app/og-image.png");
      expect(twitterImage?.content).toBe("https://little-mouse.vercel.app/og-image.png");
      expect(ogUrl?.content).toBe("https://little-mouse.vercel.app");
    } finally {
      process.env = originalEnv;
    }
  });

  it("falls back cleanly to root-relative path without malformed tags when domain is unknown", () => {
    const originalEnv = process.env;
    try {
      delete process.env.VITE_SITE_URL;
      delete process.env.SITE_URL;
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      delete process.env.VERCEL_URL;

      const meta = getSeoMeta();

      const ogImage = meta.find((m) => m.property === "og:image");
      const twitterImage = meta.find((m) => m.name === "twitter:image");
      const ogUrl = meta.find((m) => m.property === "og:url");

      expect(ogImage?.content).toBe("/og-image.png");
      expect(twitterImage?.content).toBe("/og-image.png");
      expect(ogUrl).toBeUndefined(); // Must not emit empty or malformed og:url

      // Also verify canonical link in root route head
      const rootHead = (rootRoute.options.head as any)();
      const canonical = rootHead.links?.find((l: any) => l.rel === "canonical");
      expect(canonical).toBeUndefined(); // Must not emit empty canonical link
    } finally {
      process.env = originalEnv;
    }
  });

  it("produces consistent single source of truth between root and index routes", () => {
    const rootHead = (rootRoute.options.head as any)();
    const indexHead = (indexRoute.options.head as any)();

    const rootMeta = rootHead.meta.filter((m: any) => !m.charSet && m.name !== "viewport");
    const indexMeta = indexHead.meta;

    expect(rootMeta).toEqual(indexMeta);
    expect(rootHead.meta.find((m: any) => "title" in m)?.title).toBe(SITE_TITLE);
    expect(rootHead.meta.find((m: any) => m.name === "description")?.content).toBe(SITE_DESCRIPTION);
  });
});
