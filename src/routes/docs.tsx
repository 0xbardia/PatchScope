import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/patchscope/shell";
import { breadcrumbJsonLd, seoHead } from "@/lib/seo";

const description =
  "How PatchScope scope cards, acceptance hashes, frozen packets, decisions, reviews, and change orders work.";

export const Route = createFileRoute("/docs")({
  head: () => {
    const seo = seoHead({
      title: "Documentation — PatchScope",
      description,
      path: "/docs",
    });
    return {
      meta: seo.meta,
      links: seo.links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: "How a PatchScope dispute stays bounded",
            description,
            inLanguage: "en",
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "PatchScope", path: "/" },
              { name: "Documentation", path: "/docs" },
            ]),
          ),
        },
      ],
    };
  },
  component: DocsPage,
});

function DocsPage() {
  return (
    <Shell variant="marketing">
      <article className="wrap page-copy py-14">
        <p className="kicker">Documentation</p>
        <h1 className="display mt-3">How a dispute stays bounded</h1>
        <p className="lede mt-4">
          PatchScope v1 is a scope classifier for exactly two parties. The accepted card is the contract of the
          work. The case is one request. The decision cites ids from the frozen packet.
        </p>
        <nav className="doc-toc" aria-label="On this page">
          <a href="#card">Card</a>
          <a href="#acceptance">Acceptance</a>
          <a href="#case">Request</a>
          <a href="#freeze">Freeze</a>
          <a href="#decision">Decision</a>
          <a href="#review">Review</a>
          <a href="#local">This preview</a>
        </nav>

        <h2 className="display mt-10 text-3xl" id="card">
          Scope card
        </h2>
        <p className="mt-3 text-ink-soft">
          A card has a title, the broken behavior, the expected behavior, the environment, a baseline version,
          included clauses (S-*), excluded clauses (X-*), acceptance criteria (A-*), and optional protected
          behaviors (P-*). At least one S clause and one A clause are required. Ids cannot collide. A protected
          clause also needs a scenario id such as <span className="hash">guest-eu-vat</span>.
        </p>

        <h2 className="display mt-10 text-3xl" id="acceptance">
          Acceptance
        </h2>
        <p className="mt-3 text-ink-soft">
          Proposing creates version 1 and a canonical SHA-256. Each party accepts that exact version and hash.
          The card becomes active only after both acceptances match. A revision keeps history, bumps the version,
          and deletes prior acceptances. An accepted card cannot be edited. Reject it while it is still a
          proposal, or let the deadline expire.
        </p>

        <h2 className="display mt-10 text-3xl" id="case">
          One request
        </h2>
        <p className="mt-3 text-ink-soft">
          A case holds one narrative plus one to four clause citations from the accepted card. Three or more
          numbered demands are rejected as non-atomic. Statements are append-only. Evidence is one of baseline
          report, post-patch report, test report, or public excerpt. A public excerpt is labeled unverified.
          Acknowledging a hash means “I saw this exact text,” not “I verified it.”
        </p>

        <h2 className="display mt-10 text-3xl" id="freeze">
          Freeze
        </h2>
        <p className="mt-3 text-ink-soft">
          Early freeze requires both parties to approve the current packet hash. That hash includes the accepted
          agreement hash, so an approval cannot be reused against a different card. The frozen packet keeps a copy
          of the card. Later decisions read that copy. Any new statement, evidence item, or acknowledgement clears
          early approvals. A deadline freeze is separate and uses the workspace clock in this preview. On a deployed
          contract, time must come from the GenLayer transaction context. If that clock is missing, the contract
          fails closed.
        </p>

        <h2 className="display mt-10 text-3xl" id="decision">
          Decision
        </h2>
        <p className="mt-3 text-ink-soft">
          The only classifications are IN_SCOPE, CHANGE_REQUEST, and INSUFFICIENT_EVIDENCE. Protected behavior
          cannot be treated as a regression from keywords. It needs a P clause, a baseline report, a post-patch
          report, the same scenario, a compatible environment, and declared pre and post states. If those are
          missing, the reason is CAUSATION_NOT_ESTABLISHED. This preview runs that gate locally and says so on
          the decision. It is not a GenLayer consensus result.
        </p>

        <h2 className="display mt-10 text-3xl" id="review">
          Review and change orders
        </h2>
        <p className="mt-3 text-ink-soft">
          One review may cite new evidence or an overlooked clause that the original decision did not reference.
          The original packet and decision stay put. If the review claims new evidence and none is attached, it
          cannot be closed while the review window is still open. After the window, an empty review is not
          admissible. Otherwise the review is upheld or revised. Revised means the classification actually
          changed. A change order is a new agreement. It opens only after the effective result is CHANGE_REQUEST,
          and it does not mutate the prior card.
        </p>

        <h2 className="display mt-10 text-3xl" id="local">
          What this preview stores
        </h2>
        <p className="mt-3 text-ink-soft">
          The workspace in this browser holds drafts, agreements, cases, team membership, and in-app notice
          preferences. Team membership does not authorize a chain signature. No email address is collected,
          because there is no mail delivery path. Chain reads appear on the diagnostics page only when an RPC and
          contract address are configured. Nothing here is indexed from the chain by a private backend.
        </p>
        <p className="mt-6">
          <Link to="/workspace/new" className="btn btn-primary">
            Open a scope card
          </Link>
        </p>
      </article>
    </Shell>
  );
}
