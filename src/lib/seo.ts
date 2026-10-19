export const SITE_TITLE = "Little Mouse, Big Adventure";

export const SITE_DESCRIPTION =
  "Explore a cozy, human-sized house as a tiny mouse. Collect cheese, discover hiding spots, and make your way back to your burrow.";

export const OG_IMAGE_ALT =
  "Little Mouse, Big Adventure - A brave little explorer mouse next to a glowing wedge of Swiss cheese in a cozy living room";

/**
 * Resolves the absolute site URL from environment variables,
 * supporting VITE_SITE_URL, SITE_URL, and Vercel system environment variables.
 * Returns an empty string if no production URL is configured.
 */
export function resolveSiteUrl(): string {
  const envUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SITE_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.VITE_SITE_URL ||
        process.env?.SITE_URL ||
        (process.env?.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
        (process.env?.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""))) ||
    "";

  if (!envUrl) return "";
  const trimmed = String(envUrl).trim();
  if (!trimmed) return "";

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

/**
 * Generates the standardized Open Graph and Twitter Card meta tags.
 */
export function getSeoMeta() {
  const siteUrl = resolveSiteUrl();
  const ogImageUrl = siteUrl ? `${siteUrl}/og-image.png` : "/og-image.png";

  return [
    { title: SITE_TITLE },
    { name: "description", content: SITE_DESCRIPTION },
    { property: "og:title", content: SITE_TITLE },
    { property: "og:description", content: SITE_DESCRIPTION },
    { property: "og:type", content: "website" },
    { property: "og:image", content: ogImageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: OG_IMAGE_ALT },
    ...(siteUrl ? [{ property: "og:url", content: siteUrl }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: SITE_TITLE },
    { name: "twitter:description", content: SITE_DESCRIPTION },
    { name: "twitter:image", content: ogImageUrl },
    { name: "twitter:image:alt", content: OG_IMAGE_ALT },
  ];
}
