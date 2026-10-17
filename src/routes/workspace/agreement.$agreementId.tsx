import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, Notice, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { pillClass, shortAddress, when } from "@/lib/patchscope/format";
import { changedFields, currentVersion, isParty } from "@/lib/patchscope/policy";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/agreement/$agreementId")({
  head: () => ({
    meta: [
      { title: "Agreement — PatchScope" },
      { name: "description", content: "Review a PatchScope version hash and accept, reject, or revise it." },
    ],
  }),
  component: AgreementPage,
});

function AgreementPage() {
  const { agreementId } = Route.useParams();
  const hydrated = useHydrated();
  const agreement = usePatchScope((state) => state.agreements.find((item) => item.id === agreementId));
  const actor = usePatchScope((state) => state.actor());
  const accept = usePatchScope((state) => state.accept);
  const reject = usePatchScope((state) => state.reject);
  const revise = usePatchScope((state) => state.revise);
  const expire = usePatchScope((state) => state.expire);
  const submitAgreementOnChain = usePatchScope((state) => state.submitAgreementOnChain);
  const acceptAgreementOnChain = usePatchScope((state) => state.acceptAgreementOnChain);
  const chainTxs = usePatchScope((state) => state.chainTxs);
  const [message, setMessage] = useState("");
  const [onChainPending, setOnChainPending] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const navigate = useNavigate();

  if (!hydrated) {
    return (
      <Shell variant="workspace">
        <Restore />
      </Shell>
    );
  }
  if (!agreement) {
    return (
      <Shell variant="workspace">
        <div className="wrap py-10">
          <Empty title="That agreement is not in this workspace">
            The id may be mistyped, or the local record was cleared. Nothing on a chain was queried.
          </Empty>
        </div>
      </Shell>
    );
  }
  const version = currentVersion(agreement);
  const party = isParty(actor, agreement);
  const acceptedBy = agreement.acceptances.filter((item) => item.hash === version.hash).map((item) => item.address);
  const prior = agreement.versions[agreement.versions.length - 2];
  const onChainTx = agreement.onChainTxHash ? chainTxs[agreement.onChainTxHash] : undefined;

  async function run(action: () => Promise<{ ok: boolean; message?: string } | { ok: boolean; message?: string }>) {
    setPending(true);
    const result = await action();
    setPending(false);
    setMessage(result.ok ? "Recorded in the local workspace. No chain transaction was sent." : (result.message ?? "Not recorded."));
  }

  return (
    <Shell variant="workspace">
      <article className="wrap grid gap-6 py-10">
        <header>
          <p className="eyebrow">{agreement.id}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="display text-4xl">{version.card.title}</h1>
            <span className={pillClass(agreement.status)}>{agreement.status}</span>
          </div>
          <p className="hash mt-3">Version {version.version} · {version.hash}</p>
        </header>
        <Notice title="Local record" tone="warn">
          This page is the browser workspace. Accepting here does not submit a wallet transaction. Chain truth
          appears only on the diagnostics page after a contract address is configured.
        </Notice>
        {!party ? (
          <p className="error-text" role="status">
            {shortAddress(actor)} is not a party. Switch persona, or adopt the wallet that matches the developer or client.
          </p>
        ) : null}
        <section className="grid gap-4 lg:grid-cols-2">
          <CardBlock label="Broken" text={version.card.brokenBehavior} />
          <CardBlock label="Expected" text={version.card.expectedBehavior} />
          <CardBlock label="Environment" text={version.card.environment} />
          <CardBlock label="Baseline" text={version.card.baselineVersion} />
        </section>
        <ClauseBlock title="Included" clauses={version.card.included} />
        <ClauseBlock title="Excluded" clauses={version.card.excluded} />
        <ClauseBlock title="Acceptance" clauses={version.card.acceptance} />
        <ClauseBlock title="Protected" clauses={version.card.protected} />
        <section className="panel panel-pad">
          <h2 className="display text-2xl">Acceptances on this hash</h2>
          <ul className="mt-3 grid gap-2">
            <PartyLine role="Developer" address={agreement.developer} done={acceptedBy.includes(agreement.developer)} />
            <PartyLine role="Client" address={agreement.client} done={acceptedBy.includes(agreement.client)} />
          </ul>
          <p className="hint mt-3">Deadline {when(agreement.expiresAt)}. Browser clock, not chain time.</p>
          {prior ? (
            <p className="mt-2 text-ink-soft">
              Changed since version {prior.version}: {changedFields(prior.card, version.card).join(", ") || "wording only inside a list"}.
            </p>
          ) : null}
        </section>
        <section className="panel panel-pad">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3 mb-4">
            <h2 className="display text-2xl">GenLayer Studionet Contract</h2>
            <span className={`pill ${agreement.onChainStatus === "CONFIRMED" || agreement.onChainStatus === "ACCEPTED" || agreement.onChainStatus === "FINALIZED" ? "pill-forest" : agreement.onChainStatus === "SUBMITTED" ? "pill-ink animate-pulse" : "pill-ink"}`}>
              {agreement.onChainStatus ?? "NOT_SUBMITTED"}
            </span>
          </div>
          {agreement.onChainTxHash ? (
            <div className="space-y-2 mb-4 text-sm font-mono">
              <p>
                <span className="font-semibold text-neutral-500 uppercase mr-2">Tx Hash:</span>
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${agreement.onChainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {agreement.onChainTxHash} ↗
                </a>
              </p>
              {onChainTx?.validatorVotes && onChainTx.validatorVotes.length > 0 ? (
                <p>
                  <span className="font-semibold text-neutral-500 uppercase mr-2">Consensus Votes:</span>
                  {onChainTx.validatorVotes.join(", ")}
                </p>
              ) : null}
              {onChainTx?.error ? (
                <p className="text-rose-600 font-sans">{onChainTx.error}</p>
              ) : null}
            </div>
          ) : (
            <p className="hint mb-4">
              This card currently exists in local browser storage. Submit to GenLayer Studionet to lock the scope on-chain under Optimistic Democracy.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!agreement.onChainTxHash ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={onChainPending || !party}
                onClick={async () => {
                  setOnChainPending(true);
                  const res = await submitAgreementOnChain(agreement.id);
                  setOnChainPending(false);
                  setMessage(res.ok ? `Submitted on-chain transaction: ${res.id}` : (res.message ?? "Failed to submit on-chain."));
                }}
              >
                {onChainPending ? "Broadcasting to Studionet..." : "Submit Agreement to Studionet Contract"}
              </button>
            ) : null}
            {agreement.onChainTxHash && agreement.onChainStatus !== "CONFIRMED" && agreement.onChainStatus !== "FINALIZED" ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={onChainPending}
                onClick={async () => {
                  setOnChainPending(true);
                  const res = await acceptAgreementOnChain(agreement.id);
                  setOnChainPending(false);
                  setMessage(res.ok ? `Accepted on-chain transaction: ${res.id}` : (res.message ?? "Failed to accept on-chain."));
                }}
              >
                {onChainPending ? "Accepting on Studionet..." : "Accept Agreement On-Chain (Wallet)"}
              </button>
            ) : null}
          </div>
        </section>
        {message ? (
          <p role="status" className="notice">{message}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || !party || agreement.status !== "PROPOSED"}
            onClick={() => void run(async () => accept(agreement.id, version.version, version.hash))}
          >
            Accept version {version.version}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={pending || !party || agreement.status !== "PROPOSED"}
            onClick={() => void run(async () => reject(agreement.id))}
          >
            Reject proposal
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending || agreement.status !== "PROPOSED"}
            onClick={() => void run(async () => expire(agreement.id))}
          >
            Expire if the deadline passed
          </button>
          {agreement.status === "ACCEPTED" ? (
            <Link to="/workspace/case/new" search={{ agreementId: agreement.id }} className="btn btn-primary">
              Open one request
            </Link>
          ) : null}
        </div>
        {agreement.status === "PROPOSED" && party ? (
          <form
            className="panel panel-pad grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => revise(agreement.id, { ...version.card, title: title || version.card.title }));
            }}
          >
            <h2 className="display text-2xl">Revise the title</h2>
            <p className="hint">A revision keeps history and clears both acceptances. The full card stays otherwise the same in this control.</p>
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Revised title" />
            <button type="submit" className="btn btn-ghost justify-self-start" disabled={pending || title.trim().length < 3}>
              Save revision
            </button>
          </form>
        ) : null}
        <section>
          <h2 className="display text-2xl">Version history</h2>
          <ol className="mt-3 grid gap-2">
            {[...agreement.versions].reverse().map((item) => (
              <li key={item.version} className="panel panel-pad">
                <p className="font-semibold">Version {item.version} · {when(item.createdAt)}</p>
                <p className="hash text-muted">{item.hash}</p>
                <p>{item.card.title}</p>
              </li>
            ))}
          </ol>
        </section>
        {agreement.priorAgreementId ? (
          <p>
            Change order from{" "}
            <Link to="/workspace/agreement/$agreementId" params={{ agreementId: agreement.priorAgreementId }} className="text-link underline">
              {agreement.priorAgreementId}
            </Link>
            . The older card was not edited.
          </p>
        ) : null}
        <button type="button" className="btn btn-ghost justify-self-start" onClick={() => void navigate({ to: "/workspace" })}>
          Back to the dashboard
        </button>
      </article>
    </Shell>
  );
}

function CardBlock({ label, text }: { label: string; text: string }) {
  return (
    <section className="panel panel-pad">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{label}</h2>
      <p className="mt-2">{text}</p>
    </section>
  );
}

function ClauseBlock({ title, clauses }: { title: string; clauses: { id: string; text: string; scenario: string }[] }) {
  if (!clauses.length) return null;
  return (
    <section>
      <h2 className="display text-2xl">{title}</h2>
      <ul className="mt-2 grid gap-2">
        {clauses.map((clause) => (
          <li key={clause.id} className="panel panel-pad">
            <p className="hash">{clause.id}{clause.scenario ? ` · ${clause.scenario}` : ""}</p>
            <p>{clause.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PartyLine({ role, address, done }: { role: string; address: string; done: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span>{role} · <span className="hash">{shortAddress(address)}</span></span>
      <span className={done ? "pill pill-forest" : "pill pill-ink"}>{done ? "Accepted this hash" : "Waiting"}</span>
    </li>
  );
}
