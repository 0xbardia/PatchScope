import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/patchscope/shell";
import { breadcrumbJsonLd, seoHead } from "@/lib/seo";

const description = "What PatchScope v1 includes, what is intentionally absent, and what would come next.";

export const Route = createFileRoute("/roadmap")({
  head: () => {
    const seo = seoHead({ title: "Roadmap — PatchScope", description, path: "/roadmap" });
    return {
      meta: seo.meta,
      links: seo.links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "PatchScope", path: "/" },
              { name: "Roadmap", path: "/roadmap" },
            ]),
          ),
        },
      ],
    };
  },
  component: RoadmapPage,
});

function RoadmapPage() {
  return (
    <Shell variant="marketing">
      <article className="wrap page-copy py-14">
        <p className="kicker">Roadmap</p>
        <h1 className="display mt-3">v1 is a scope record, not a marketplace</h1>
        <p className="lede mt-4">
          The list below is the product boundary. Items marked later are not quietly half-built.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <section className="panel panel-pad card-moss">
            <h2 className="display text-2xl">In this v1</h2>
            <ul className="mt-4 grid list-disc gap-2 pl-5 text-ink-soft">
              <li>Structured scope card with S, X, A, and P clauses</li>
              <li>Two-party acceptance of an exact version hash</li>
              <li>Revision history that invalidates approval</li>
              <li>One atomic request, statements, and typed evidence</li>
              <li>Counterparty acknowledgement of a content hash</li>
              <li>Early freeze bound to the accepted agreement hash, plus deadline freeze</li>
              <li>Frozen packet stores a copy of the accepted card</li>
              <li>Deterministic classification gate</li>
              <li>One review round; empty new-evidence reviews stay open until the window ends</li>
              <li>A change order is a new card, never an edit of the old one</li>
              <li>Local team owner and member controls</li>
              <li>Public read diagnostics when a contract is configured</li>
            </ul>
          </section>
          <section className="panel panel-pad card-clay">
            <h2 className="display text-2xl">Kept out on purpose</h2>
            <ul className="mt-4 grid list-disc gap-2 pl-5 text-ink-soft">
              <li>Escrow, invoices, tokens, and reputation scores</li>
              <li>Admin pause, upgrade, or hidden override</li>
              <li>Arbitrary web crawling as consensus truth</li>
              <li>Email collection without a delivery path</li>
              <li>A backend key that signs for the user</li>
              <li>A private-case promise on a public chain</li>
            </ul>
          </section>
          <section className="panel panel-pad card-slate">
            <h2 className="display text-2xl">Next, if v1 holds</h2>
            <ul className="mt-4 grid list-disc gap-2 pl-5 text-ink-soft">
              <li>Studio deployment after a manual source-hash approval</li>
              <li>Wallet signatures on every network write</li>
              <li>Equivalence-checked model adjudication beside the gate</li>
              <li>Optional HTTPS excerpt import inside the VM, still frozen before decision</li>
              <li>Shared Postgres drafts with wallet-session auth</li>
              <li>An external review, named as such only if it happens</li>
            </ul>
          </section>
        </div>
        <p className="mt-8">
          <Link to="/docs" className="text-link font-semibold underline">
            Back to the docs
          </Link>
        </p>
      </article>
    </Shell>
  );
}
