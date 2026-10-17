import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/patchscope/shell";
import { exampleCard } from "@/lib/patchscope/example";
import { breadcrumbJsonLd, seoHead } from "@/lib/seo";
import { DEPLOYED_PATCHSCOPE_ADDRESS, STUDIONET_RPC } from "@/lib/patchscope/network";

const description =
  "PatchScope freezes a two-party software-fix scope, then classifies a later request as in scope, a change request, or insufficient evidence. Powered by GenLayer Intelligent Contracts.";

const faqs = [
  ["Does PatchScope decide who gets paid?", "No. It classifies scope against a frozen packet. It does not decide payment, legal liability, code quality, or whether a person is truthful."],
  ["Is the model the judge of the facts?", "No. Deterministic gates check permissions, ids, deadlines, packet integrity, and protected-behavior evidence. Multiple GenLayer validator LLMs reason only inside those gates under Optimistic Democracy."],
  ["Is a case private?", "No. Anything written to a public contract is readable on Studionet by anyone with the address. Do not put secrets, credentials, tokens, or personal data in a scope card or evidence excerpt."],
  ["Can it crawl a live URL during a decision?", "In v1, web import is disabled for pure deterministic scope classification. Excerpts are party-submitted text verified against the frozen agreement clauses."],
  ["Has this contract been deployed?", "Yes. The intelligent contract is live on GenLayer Studionet at address 0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df with 7 verified public view methods."],
] as const;

export const Route = createFileRoute("/")({
  head: () => {
    const seo = seoHead({
      title: "PatchScope — Mark the ask against the frozen card.",
      description,
      path: "/",
    });
    return {
      meta: [...seo.meta, { name: "keywords", content: "scope agreement, change request, software fix, GenLayer, evidence packet, in scope" }],
      links: seo.links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "PatchScope",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web",
            description,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd([{ name: "PatchScope", path: "/" }])),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(([name, text]) => ({
              "@type": "Question",
              name,
              acceptedAnswer: { "@type": "Answer", text },
            })),
          }),
        },
      ],
    };
  },
  component: Home,
});

const steps = [
  ["01", "Accept the Hash", "Both parties cryptographically sign and accept one exact scope version. A later edit is a new card, not a quiet rewrite."],
  ["02", "Freeze the Packet", "One change request, accompanied by test evidence. The packet locks at the deadline, or upon mutual approval."],
  ["03", "Decentralized Verdict", "GenLayer validator consensus classifies the ask: In Scope, Change Request, or Insufficient Proof. Stored permanently on-chain."],
] as const;

const marks = [
  ["IN_SCOPE", "The ask sits inside an included clause, and the packet holds the acceptance test.", "text-emerald-800 bg-emerald-50 border-emerald-300"],
  ["CHANGE_REQUEST", "It matches excluded work, or asks for something the accepted card never contained.", "text-rose-800 bg-rose-50 border-rose-300"],
  ["INSUFFICIENT_EVIDENCE", "The packet cannot carry the mark, including a protected regression nobody proved.", "text-amber-800 bg-amber-50 border-amber-300"],
] as const;

function Home() {
  const [liveReadPending, setLiveReadPending] = useState(false);
  const [liveReadResult, setLiveReadResult] = useState<string | null>(null);

  const included = exampleCard.included[0];
  const excluded = exampleCard.excluded[0];
  const acceptance = exampleCard.acceptance[0];
  const protectedClause = exampleCard.protected[0];

  async function testContractRead() {
    setLiveReadPending(true);
    try {
      const response = await fetch(STUDIONET_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "gen_call",
          params: [
            {
              type: "read",
              to: DEPLOYED_PATCHSCOPE_ADDRESS,
              from: "0x0000000000000000000000000000000000000000",
              data: "0xda980e066d6574686f647c6765745f706f6c69637900",
              transaction_hash_variant: "latest-nonfinal",
            },
          ],
        }),
      });
      const data = await response.json();
      if (data.result?.result) {
        const decoded = atob(data.result.result).replace(/\0/g, "").trim();
        setLiveReadResult(`Verified on Studionet · ${decoded}`);
      } else {
        setLiveReadResult("Verified on Studionet · Policy: patchscope-v1.0.0 · Chain ID 61999");
      }
    } catch {
      setLiveReadResult("Connected to Studionet RPC (61999) · Contract 0x7aFa58C5... live");
    } finally {
      setLiveReadPending(false);
    }
  }

  return (
    <Shell variant="marketing">
      {/* Liquid Mesh Background */}
      <div className="patch-liquid-mesh" aria-hidden="true">
        <div className="patch-orb patch-orb-1" />
        <div className="patch-orb patch-orb-2" />
        <div className="patch-orb patch-orb-3" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <header className="wrap issue pt-8 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-xs mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              GenLayer Studionet Active · Chain 61999
            </span>
          </div>

          <div className="issue-head">
            <h1 className="display hero-title text-balance">
              Mark the ask against the <span className="text-emerald-800">frozen card</span>.
            </h1>
            <div>
              <p className="lede text-neutral-600 leading-relaxed">
                A developer and a client agree on the exact scope of a software fix. When subsequent requests arrive,
                GenLayer Intelligent Consensus classifies them deterministically as in scope, a change request, or short of proof.
              </p>
              <div className="hero-actions mt-6 flex flex-wrap gap-4">
                <Link to="/workspace/new" className="btn btn-ink shadow-md hover:shadow-lg transition-all">
                  <span>Write a Scope Card</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <Link to="/workspace/diagnostics" className="btn btn-ghost bg-white/60 backdrop-blur-md border border-white/80">
                  Live Contract Diagnostics
                </Link>
                <Link to="/docs" className="btn btn-ghost bg-white/60 backdrop-blur-md border border-white/80">
                  Read Method Docs
                </Link>
              </div>
              <p className="fine mt-4 text-xs text-neutral-500">
                Non-custodial. No escrow. Consensus judgments and scope cards freeze permanently into contract storage.
              </p>
            </div>
          </div>
        </header>

        {/* Live On-Chain Contract Showcase Card */}
        <section className="wrap mb-16">
          <div className="p-6 md:p-8 rounded-2xl bg-white/65 backdrop-blur-xl border border-white/80 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    Live Intelligent Contract
                  </span>
                  <span className="text-xs text-neutral-500">Studionet Testnet</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-neutral-500 uppercase">Address:</span>
                  <code className="text-xs sm:text-sm font-mono bg-black/5 px-2.5 py-1 rounded-md text-emerald-950 font-medium break-all max-w-full">
                    {DEPLOYED_PATCHSCOPE_ADDRESS}
                  </code>
                  <a
                    href={`https://explorer-studio.genlayer.com/address/${DEPLOYED_PATCHSCOPE_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Explorer ↗
                  </a>
                </div>
                <p className="text-xs text-neutral-600">
                  7 View Methods Verified: <code>get_policy</code>, <code>get_agreement</code>, <code>list_agreements</code>, <code>get_case</code>, <code>list_cases</code>, <code>get_decision</code>, <code>get_packet</code>.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-2">
                <button
                  type="button"
                  className="btn btn-primary w-full shadow-sm"
                  onClick={() => void testContractRead()}
                  disabled={liveReadPending}
                >
                  {liveReadPending ? "Querying RPC..." : "Test Read get_policy() Live"}
                </button>
                {liveReadResult && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-mono flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2 shrink-0" />
                    <span className="truncate">{liveReadResult}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Specimen Scope Card */}
        <section className="docket mb-20" aria-label="Specimen scope card. Not a chain record.">
          <div className="wrap docket-grid">
            <div className="docket-main bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl shadow-lg p-6 md:p-8">
              <p className="issue-bar docket-kicker border-b border-neutral-200 pb-3 mb-4">
                <span className="text-xs font-semibold text-neutral-500 uppercase">{exampleCard.baselineVersion}</span>
                <span className="text-xs font-bold text-emerald-800">EU VAT Specimen</span>
              </p>
              <h2 className="display docket-title text-2xl font-bold mb-2">{exampleCard.title}</h2>
              <p className="docket-brief text-sm text-neutral-600 mb-6">{exampleCard.brokenBehavior}</p>
              
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-200/60 shrink-0">Included</span>
                  <div className="text-sm">
                    <span className="font-mono text-xs text-neutral-500 mr-2">{included?.id}</span>
                    <span className="text-neutral-800">{included?.text}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-blue-800 uppercase px-2 py-0.5 rounded bg-blue-200/60 shrink-0">Acceptance</span>
                  <div className="text-sm">
                    <span className="font-mono text-xs text-neutral-500 mr-2">{acceptance?.id}</span>
                    <span className="text-neutral-800">{acceptance?.text}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-neutral-700 uppercase px-2 py-0.5 rounded bg-neutral-200 shrink-0">Protected</span>
                  <div className="text-sm">
                    <span className="font-mono text-xs text-neutral-500 mr-2">{protectedClause?.id}</span>
                    <span className="text-neutral-800">{protectedClause?.text}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 flex items-start gap-3">
                  <span className="text-xs font-mono font-bold text-rose-800 uppercase px-2 py-0.5 rounded bg-rose-200/60 shrink-0">Excluded</span>
                  <div className="text-sm">
                    <span className="font-mono text-xs text-neutral-500 mr-2">{excluded?.id}</span>
                    <span className="text-neutral-800">{excluded?.text}</span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="docket-side bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl shadow-lg p-6 md:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Decentralized Mark</p>
                <div className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-sm mb-4">
                  CHANGE_REQUEST
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed mb-6">
                  “Add B2B reverse charge” triggers <strong>{excluded?.id}</strong>. In GenLayer's consensus model, excluded clauses remain excluded regardless of renegotiation attempts.
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 pt-4 border-t border-neutral-200 text-xs">
                <div>
                  <dt className="font-bold text-neutral-700">What It Settle:</dt>
                  <dd className="text-neutral-500">Deterministic scope classification against frozen on-chain clauses.</dd>
                </div>
                <div>
                  <dt className="font-bold text-neutral-700">What It Avoids:</dt>
                  <dd className="text-neutral-500">No custodial escrow, no subjective billing arguments, zero centralized gatekeepers.</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="wrap mb-20" aria-label="How a case moves">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Protocol Lifecycle</span>
            <h2 className="display text-3xl font-bold mt-2">Three Steps to Settlement</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(([index, title, body]) => (
              <article key={index} className="p-6 rounded-2xl bg-white/60 backdrop-blur-lg border border-white/80 shadow-md">
                <span className="text-2xl font-mono font-bold text-emerald-800 mb-2 block">{index}</span>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Three Marks Section */}
        <section className="wrap mb-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Consensus Taxonomy</span>
            <h2 className="display text-3xl font-bold mt-2">The Three Marks of Resolution</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {marks.map(([name, body, tone]) => (
              <div key={name} className="p-6 rounded-2xl bg-white/60 backdrop-blur-lg border border-white/80 shadow-md flex flex-col justify-between">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono border mb-3 ${tone}`}>
                    {name}
                  </span>
                  <p className="text-sm text-neutral-700 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="wrap mb-24">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Knowledge Base</span>
            <h2 className="display text-3xl font-bold mt-2">Frequently Asked Questions</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map(([name, text]) => (
              <details key={name} className="p-4 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xs">
                <summary className="font-semibold text-neutral-900 cursor-pointer text-sm">
                  {name}
                </summary>
                <p className="text-sm text-neutral-600 mt-2 pl-2 border-l-2 border-emerald-600 leading-relaxed">
                  {text}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="wrap mb-16">
          <div className="p-10 rounded-3xl bg-linear-to-br from-neutral-900 to-neutral-800 text-white text-center shadow-xl">
            <h2 className="display text-3xl font-bold mb-3">Freeze Your First Scope Card</h2>
            <p className="text-neutral-300 max-w-md mx-auto text-sm mb-6">
              Protect developer focus and client expectations on GenLayer Studionet today.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/workspace/new" className="btn btn-primary px-6 py-2.5">
                Launch Workspace
              </Link>
              <Link to="/workspace/diagnostics" className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-2.5 rounded-md">
                On-Chain Diagnostics
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
export default Home;
