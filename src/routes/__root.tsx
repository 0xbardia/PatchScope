import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Web3Frame } from "@/components/patchscope/web3-frame";
import sansFont from "@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2?url";
import serifFont from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PatchScope" },
      {
        name: "description",
        content:
          "PatchScope is a two-party scope ledger. Freeze a software-fix card, then classify a later request as in scope, a change request, or insufficient evidence.",
      },
      { name: "theme-color", content: "#12141a" },
      { name: "author", content: "PatchScope" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preload", href: sansFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "preload", href: serifFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "manifest", href: "/__pwa/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__pwa/icon-180.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <PreviewHostBridge />
        <AuthProvider>
          <Web3Frame>
            <Outlet />
          </Web3Frame>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
