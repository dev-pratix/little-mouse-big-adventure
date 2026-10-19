import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { Route as rootRoute } from "@/routes/__root";
import { Route as indexRoute } from "@/routes/index";

describe("Branding and Social Preview Metadata", () => {
  const rootHead = (rootRoute.options.head as () => { meta?: any[]; links?: any[] })?.() ?? {};
  const indexHead = (indexRoute.options.head as () => { meta?: any[]; links?: any[] })?.() ?? {};

  it("defines exact title and description in root and index routes", () => {
    const expectedTitle = "Little Mouse, Big Adventure";
    const expectedDescription =
      "Explore a cozy, human-sized house as a tiny mouse. Collect cheese, discover hiding spots, and make your way back to your burrow.";

    const rootTitle = rootHead.meta?.find((m) => "title" in m)?.title;
    const indexTitle = indexHead.meta?.find((m) => "title" in m)?.title;
    expect(rootTitle).toBe(expectedTitle);
    expect(indexTitle).toBe(expectedTitle);

    const rootDesc = rootHead.meta?.find((m) => m.name === "description")?.content;
    const indexDesc = indexHead.meta?.find((m) => m.name === "description")?.content;
    expect(rootDesc).toBe(expectedDescription);
    expect(indexDesc).toBe(expectedDescription);
  });

  it("configures Open Graph metadata for LinkedIn and social platforms", () => {
    const expectedTitle = "Little Mouse, Big Adventure";
    const expectedDescription =
      "Explore a cozy, human-sized house as a tiny mouse. Collect cheese, discover hiding spots, and make your way back to your burrow.";

    for (const head of [rootHead, indexHead]) {
      const ogTitle = head.meta?.find((m) => m.property === "og:title")?.content;
      const ogDesc = head.meta?.find((m) => m.property === "og:description")?.content;
      const ogType = head.meta?.find((m) => m.property === "og:type")?.content;
      const ogImage = head.meta?.find((m) => m.property === "og:image")?.content;
      const ogImageWidth = head.meta?.find((m) => m.property === "og:image:width")?.content;
      const ogImageHeight = head.meta?.find((m) => m.property === "og:image:height")?.content;
      const ogImageAlt = head.meta?.find((m) => m.property === "og:image:alt")?.content;

      expect(ogTitle).toBe(expectedTitle);
      expect(ogDesc).toBe(expectedDescription);
      expect(ogType).toBe("website");
      expect(ogImage).toContain("og-image.png");
      expect(ogImageWidth).toBe("1200");
      expect(ogImageHeight).toBe("630");
      expect(ogImageAlt).toBeTruthy();
    }
  });

  it("configures Twitter Cards metadata with summary_large_image", () => {
    for (const head of [rootHead, indexHead]) {
      const card = head.meta?.find((m) => m.name === "twitter:card")?.content;
      const title = head.meta?.find((m) => m.name === "twitter:title")?.content;
      const desc = head.meta?.find((m) => m.name === "twitter:description")?.content;
      const image = head.meta?.find((m) => m.name === "twitter:image")?.content;
      const imageAlt = head.meta?.find((m) => m.name === "twitter:image:alt")?.content;

      expect(card).toBe("summary_large_image");
      expect(title).toBe("Little Mouse, Big Adventure");
      expect(desc).toContain("Explore a cozy, human-sized house as a tiny mouse");
      expect(image).toContain("og-image.png");
      expect(imageAlt).toBeTruthy();
    }
  });

  it("removes generic Lovable author and twitter handles from head metadata", () => {
    for (const head of [rootHead, indexHead]) {
      const author = head.meta?.find((m) => m.name === "author");
      const twitterSite = head.meta?.find((m) => m.name === "twitter:site");
      expect(author?.content).not.toBe("Lovable");
      expect(twitterSite?.content).not.toBe("@Lovable");
    }
  });

  it("links to custom svg and ico favicons in root head", () => {
    const iconSvg = rootHead.links?.find((l) => l.type === "image/svg+xml");
    const iconIco = rootHead.links?.find((l) => l.type === "image/x-icon");

    expect(iconSvg?.href).toBe("/favicon.svg");
    expect(iconIco?.href).toBe("/favicon.ico");
  });

  it("verifies public branding assets exist on disk", () => {
    const publicDir = path.resolve(__dirname, "../../public");
    expect(fs.existsSync(path.join(publicDir, "og-image.png"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "favicon.svg"))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, "favicon.ico"))).toBe(true);

    const ogStats = fs.statSync(path.join(publicDir, "og-image.png"));
    expect(ogStats.size).toBeGreaterThan(10000);
  });
});
