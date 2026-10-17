type HeadMeta = Record<string, string>;
type HeadLink = { rel: string; href: string; crossOrigin?: "anonymous" };

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
};

/** Absolute origin during SSR (request storage) or in the browser. Never invents a host. */
export function requestOrigin(): string | undefined {
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin;
  const storage = (globalThis as Record<symbol, { getStore?: () => { h3Event?: { url?: URL | string } } | undefined }>)[
    Symbol.for("tanstack-start:event-storage")
  ];
  const raw = storage?.getStore?.()?.h3Event?.url;
  if (raw instanceof URL) return raw.origin;
  if (typeof raw === "string") {
    try {
      return new URL(raw).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function absoluteUrl(path: string): string {
  const origin = requestOrigin();
  return origin ? `${origin}${path}` : path;
}

export function seoHead(input: SeoInput): { meta: HeadMeta[]; links: HeadLink[] } {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl("/og.jpg");
  const index = input.index !== false;
  return {
    meta: [
      { title: input.title },
      { name: "description", content: input.description },
      { name: "robots", content: index ? "index, follow" : "noindex, nofollow" },
      { property: "og:site_name", content: "PatchScope" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: input.title },
      { property: "og:description", content: input.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: "PatchScope — freeze the card, classify the ask." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: input.title },
      { name: "twitter:description", content: input.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
