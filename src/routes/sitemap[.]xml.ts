import { createFileRoute } from "@tanstack/react-router";

const paths = [
  { path: "/", priority: "1.0" },
  { path: "/docs", priority: "0.8" },
  { path: "/roadmap", priority: "0.7" },
  { path: "/security", priority: "0.5" },
  { path: "/privacy", priority: "0.4" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const lastmod = "2026-10-14";
        const urls = paths
          .map(
            (item) =>
              `<url><loc>${origin}${item.path}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${item.priority}</priority></url>`,
          )
          .join("");
        const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
