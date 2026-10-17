import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/patchscope/shell";
import { breadcrumbJsonLd, seoHead } from "@/lib/seo";

const description =
  "PatchScope self-review: trust boundaries, prompt-injection stance, and what this release does not claim.";

export const Route = createFileRoute("/security")({
  head: () => {
    const seo = seoHead({ title: "Security — PatchScope", description, path: "/security" });
    return {
      meta: seo.meta,
      links: seo.links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "PatchScope", path: "/" },
              { name: "Security", path: "/security" },
            ]),
          ),
        },
      ],
    };
  },
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <Shell variant="marketing">
      <article className="wrap page-copy py-14">
        <p className="kicker">Security</p>
        <h1 className="display mt-3">Self-review, not an audit</h1>
        <p className="lede mt-4">
          PatchScope has not had a third-party audit. Do not describe it as exploit-proof, Gold tier, or
          bug-free. Report issues against the repository disclosure policy when the source is published.
        </p>
        <h2 className="display mt-10 text-3xl">Trust boundaries</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-ink-soft">
          <li>Party text, evidence, and future model output are untrusted data.</li>
          <li>Policy, allowed classifications, ids, and deadlines are not chosen by that data.</li>
          <li>Keyword overlap is not proof that a protected behavior regressed.</li>
          <li>An acknowledgement is not verification.</li>
          <li>A local preview decision is not chain truth and is labeled on the decision itself.</li>
          <li>Team membership never becomes a signature.</li>
          <li>There is no server key that can submit a transaction.</li>
        </ul>
        <h2 className="display mt-10 text-3xl">Injection stance</h2>
        <p className="mt-3 text-ink-soft">
          Instructions hidden in a request, a clause, or an excerpt cannot select the classification. The local
          gate cites clause ids the user selected and evidence ids the packet actually holds. A deployed model
          path must keep the same gate after any nondeterministic read, and a shared invalid verdict is treated
          as a product bug, not as consensus success.
        </p>
        <h2 className="display mt-10 text-3xl">Known limits</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-ink-soft">
          <li>This preview clock is the browser clock, not GenLayer time.</li>
          <li>Web import is disabled. The runtime is not asked to fetch URLs.</li>
          <li>WalletConnect is disabled until a real project id is supplied. None is invented here.</li>
          <li>Local storage can be edited by whoever controls the browser. It is a workspace, not evidence.</li>
          <li>Studionet deployment and a two-wallet chain journey are not claimed until a receipt exists.</li>
        </ul>
        <p className="mt-6">
          <Link to="/roadmap" className="text-link font-semibold underline">
            See what is intentionally deferred
          </Link>
        </p>
      </article>
    </Shell>
  );
}
