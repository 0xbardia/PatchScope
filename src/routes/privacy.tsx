import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/patchscope/shell";
import { breadcrumbJsonLd, seoHead } from "@/lib/seo";

const description =
  "What PatchScope stores in the browser, what would be public on-chain, and what it refuses to collect.";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const seo = seoHead({ title: "Privacy — PatchScope", description, path: "/privacy" });
    return {
      meta: seo.meta,
      links: seo.links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "PatchScope", path: "/" },
              { name: "Privacy", path: "/privacy" },
            ]),
          ),
        },
      ],
    };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Shell variant="marketing">
      <article className="wrap page-copy py-14">
        <p className="kicker">Privacy</p>
        <h1 className="display mt-3">Assume chain text is public</h1>
        <div className="mt-6 grid gap-4 text-ink-soft">
          <p>
            This preview stores the workspace in local storage on this browser: scope drafts, agreements, cases,
            the team list, activity, and two in-app notice toggles. Clearing site data removes it. It is not
            encrypted at rest by the app.
          </p>
          <p>
            Demo personas are labeled sample addresses. They are not wallets and they do not sign transactions.
            If you connect an injected wallet, the app reads the selected account and chain id. It does not
            receive a seed phrase. WalletConnect is not enabled.
          </p>
          <p>
            No email address is requested. There is no mailing list and no notification vendor. In-app notices
            are only a local activity filter.
          </p>
          <p>
            If a contract address is later configured, agreement text, statements, and evidence excerpts written
            on-chain can be read by anyone who can call the contract. Do not submit secrets, credentials, health
            data, or government identifiers. A public excerpt is still unverified party text.
          </p>
          <p>
            The app does not sell data, and this page is not a promise that a future deployment will be private.
            Public-chain records are the opposite of a confidential filing.
          </p>
        </div>
      </article>
    </Shell>
  );
}
