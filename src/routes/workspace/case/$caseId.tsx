import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Field, Notice, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { pillClass, shortAddress, shortHash, when } from "@/lib/patchscope/format";
import {
  clauseMap,
  currentVersion,
  effectiveDecision,
  isParty,
  type EvidenceType,
} from "@/lib/patchscope/policy";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

const sections = ["request", "evidence", "freeze", "decision", "review", "change"] as const;
type Section = (typeof sections)[number];

export const Route = createFileRoute("/workspace/case/$caseId")({
  validateSearch: (search: Record<string, unknown>): { section: Section } => {
    const value = typeof search.section === "string" ? search.section : "request";
    return { section: (sections as readonly string[]).includes(value) ? (value as Section) : "request" };
  },
  head: () => ({
    meta: [
      { title: "Case workspace — PatchScope" },
      { name: "description", content: "Statements, evidence, freeze, decision, review, and change order for one request." },
    ],
  }),
  component: CasePage,
});

function CasePage() {
  const { caseId } = Route.useParams();
  const { section } = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const record = usePatchScope((state) => state.cases.find((item) => item.id === caseId));
  const agreements = usePatchScope((state) => state.agreements);
  const agreement = agreements.find((item) => item.id === record?.agreementId);
  const spawned = agreements.filter((item) => item.sourceCaseId === caseId);
  const actor = usePatchScope((state) => state.actor());
  const actions = usePatchScope();
  const [message, setMessage] = useState("");
  const [onChainPending, setOnChainPending] = useState(false);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const chainTxs = actions.chainTxs;
  const onChainTx = record?.onChainTxHash ? chainTxs[record.onChainTxHash] : undefined;
  const decisionTx = record?.decisionTxHash ? chainTxs[record.decisionTxHash] : undefined;
  useEffect(() => {
    setNow(Date.now());
  }, [record?.updatedAt, record?.status]);

  if (!hydrated) {
    return (
      <Shell variant="workspace">
        <Restore />
      </Shell>
    );
  }
  if (!record || !agreement) {
    return (
      <Shell variant="workspace">
        <div className="wrap py-10">
          <Notice title="Missing case">That case id is not in this browser workspace. No chain read was attempted.</Notice>
        </div>
      </Shell>
    );
  }

  const party = isParty(actor, agreement);
  const version = currentVersion(agreement);
  const decision = effectiveDecision(record);
  const windowClosed = now !== null && record.status === "OPEN" && now >= record.deadlineAt;
  const inputLocked = pending || !party || record.status !== "OPEN" || windowClosed;
  async function run(work: () => Promise<{ ok: boolean; message?: string; id?: string }>) {
    setPending(true);
    const result = await work();
    setPending(false);
    setMessage(
      result.ok
        ? `Saved in the local workspace${result.id ? ` (${result.id})` : ""}. This was not a chain transaction, so there is no transaction hash to recover.`
        : result.message || "Nothing was saved.",
    );
    return result;
  }

  return (
    <Shell variant="workspace">
      <div className="wrap grid gap-6 py-10">
        <header>
          <p className="eyebrow">{record.id} · {agreement.id}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="display text-4xl">Case workspace</h1>
            <span className={pillClass(record.status)}>{record.status}</span>
          </div>
          <p className="mt-3 max-w-3xl">{record.requestText}</p>
          <p className="hash mt-2 text-muted">Cites {record.citedClauseIds.join(", ")} · agreement {shortHash(version.hash)}</p>
        </header>
        {!party ? (
          <p className="error-text" role="status">Switch to the developer or client persona before writing.</p>
        ) : null}
        <nav className="flex flex-wrap gap-2" aria-label="Case sections">
          {sections.map((item) => (
            <Link
              key={item}
              to="/workspace/case/$caseId"
              params={{ caseId }}
              search={{ section: item }}
              className={item === section ? "btn btn-primary" : "btn btn-ghost"}
              aria-current={item === section ? "page" : undefined}
            >
              {item}
            </Link>
          ))}
        </nav>
        <section className="panel panel-pad">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3 mb-4">
            <h2 className="display text-2xl">GenLayer Studionet Contract</h2>
            <span className={`pill ${record.onChainStatus === "CONFIRMED" || record.onChainStatus === "ACCEPTED" || record.onChainStatus === "FINALIZED" ? "pill-forest" : record.onChainStatus === "SUBMITTED" ? "pill-ink animate-pulse" : "pill-ink"}`}>
              {record.onChainStatus ?? "NOT_SUBMITTED"}
            </span>
          </div>
          {record.onChainTxHash ? (
            <div className="space-y-2 mb-4 text-sm font-mono">
              <p>
                <span className="font-semibold text-neutral-500 uppercase mr-2">Case Tx:</span>
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${record.onChainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {record.onChainTxHash} ↗
                </a>
              </p>
              {record.decisionTxHash ? (
                <p>
                  <span className="font-semibold text-neutral-500 uppercase mr-2">Decision Tx:</span>
                  <a
                    href={`https://explorer-studio.genlayer.com/tx/${record.decisionTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {record.decisionTxHash} ↗
                  </a>
                </p>
              ) : null}
              {decisionTx?.validatorVotes && decisionTx.validatorVotes.length > 0 ? (
                <p>
                  <span className="font-semibold text-neutral-500 uppercase mr-2">Consensus Votes:</span>
                  {decisionTx.validatorVotes.join(", ")}
                </p>
              ) : null}
              {onChainTx?.error || decisionTx?.error ? (
                <p className="text-rose-600 font-sans">{onChainTx?.error || decisionTx?.error}</p>
              ) : null}
            </div>
          ) : (
            <p className="hint mb-4">
              This case currently exists in local browser storage. Submit to GenLayer Studionet contract to classify the request under decentralized consensus.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!record.onChainTxHash ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={onChainPending || !party}
                onClick={async () => {
                  setOnChainPending(true);
                  const res = await actions.openCaseOnChain(record.id);
                  setOnChainPending(false);
                  setMessage(res.ok ? `Submitted case on-chain: ${res.id}` : (res.message ?? "Failed to submit case on-chain."));
                }}
              >
                {onChainPending ? "Broadcasting to Studionet..." : "Submit Case to Studionet Contract"}
              </button>
            ) : null}
            {record.onChainTxHash && record.status === "FROZEN" && !record.decisionTxHash ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={onChainPending || !party}
                onClick={async () => {
                  setOnChainPending(true);
                  const res = await actions.requestDecisionOnChain(record.id);
                  setOnChainPending(false);
                  setMessage(res.ok ? `Requested on-chain decision: ${res.id}` : (res.message ?? "Failed to request on-chain decision."));
                }}
              >
                {onChainPending ? "Querying Consensus..." : "Request GenLayer Validator Decision (Wallet)"}
              </button>
            ) : null}
          </div>
        </section>
        {windowClosed ? (
          <p className="notice notice-warn" role="status">
            The response window has closed. New statements, evidence, acknowledgements, and freeze approvals are refused.
            Freeze still locks the packet that was already there.
          </p>
        ) : null}
        {message ? <p className="notice" role="status">{message}</p> : null}
        {section === "request" ? (
          <RequestSection
            statements={record.statements}
            disabled={inputLocked}
            onSubmit={(text) => run(async () => actions.statement(record.id, text))}
          />
        ) : null}
        {section === "evidence" ? (
          <EvidenceSection
            evidence={record.evidence.filter((item) => !item.addedDuringReview)}
            acknowledgements={record.acknowledgements}
            actor={actor}
            environment={version.card.environment}
            disabled={inputLocked}
            onSubmit={(draft) => run(async () => actions.evidence(record.id, draft))}
            onAck={(id, hash) => run(async () => actions.acknowledge(record.id, id, hash))}
          />
        ) : null}
        {section === "freeze" ? (
          <section className="grid gap-4">
            <Notice title="Freeze the exact packet">
              Both parties must approve the current packet, or the local deadline must have passed. New input clears
              early-freeze approvals and is refused once the deadline passes. Deadline {when(record.deadlineAt)}. The
              deadline uses this browser’s clock, not a chain timestamp.
            </Notice>
            <ul className="grid gap-2">
              {record.freezeApprovals.map((item) => (
                <li key={item.address} className="hash">
                  {shortAddress(item.address)} approved {shortHash(item.packetHash)}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={inputLocked} onClick={() => void run(async () => actions.approveFreeze(record.id))}>
                Approve this packet
              </button>
              <button type="button" className="btn btn-ghost" disabled={pending || record.status !== "OPEN"} onClick={() => void run(async () => actions.freeze(record.id, false))}>
                Freeze if both approved
              </button>
              <button type="button" className="btn btn-ghost" disabled={pending || record.status !== "OPEN"} onClick={() => void run(async () => actions.freeze(record.id, true))}>
                Freeze if the deadline passed
              </button>
            </div>
            {record.frozen ? <p className="hash">Frozen packet {record.frozen.packetHash}</p> : null}
          </section>
        ) : null}
        {section === "decision" ? (
          <section className="grid gap-4">
            <Notice tone="warn" title="Local policy preview">
              The button below runs the deterministic gate in this browser. It is not a GenLayer consensus decision, and it is not a payment or liability finding.
            </Notice>
            {record.decision ? <DecisionView decision={record.decision} title="Initial decision" /> : <p>No initial decision yet.</p>}
            {decision && record.review?.result?.reviewStatus === "REVISED" ? (
              <DecisionView decision={decision} title="Effective result after review" />
            ) : null}
            <button type="button" className="btn btn-primary justify-self-start" disabled={pending || !party || record.status !== "FROZEN"} onClick={() => void run(async () => actions.decide(record.id))}>
              Request the local decision
            </button>
          </section>
        ) : null}
        {section === "review" ? (
          <ReviewSection
            recordStatus={record.status}
            disabled={pending || !party}
            onOpen={(grounds, note, overlooked, windowMs) =>
              run(async () => actions.beginReview(record.id, grounds, note, overlooked, windowMs))
            }
            onEvidence={(draft) => run(async () => actions.reviewEvidence(record.id, draft))}
            onFinish={() => run(async () => actions.finishReview(record.id))}
            review={record.review}
            now={now}
            clauses={[...clauseMap(version.card).values()].map((clause) => clause.id)}
            environment={version.card.environment}
          />
        ) : null}
        {section === "change" ? (
          <>
          <ChangeSection
            allowed={decision?.classification === "CHANGE_REQUEST"}
            disabled={pending || !party}
            title={version.card.title}
            onSubmit={async (nextTitle) => {
              const result = await run(async () =>
                actions.changeOrder(record.id, { ...version.card, title: nextTitle }, agreement.developer, agreement.client),
              );
              if (result.ok && result.id) {
                await navigate({ to: "/workspace/agreement/$agreementId", params: { agreementId: result.id } });
              }
            }}
          />
          {spawned.length > 0 ? (
            <ul className="grid gap-2">
              {spawned.map((item) => (
                <li key={item.id}>
                  <Link to="/workspace/agreement/$agreementId" params={{ agreementId: item.id }} className="text-link font-semibold underline">
                    Open {item.id}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          </>
        ) : null}
      </div>
    </Shell>
  );
}

function RequestSection({
  statements,
  disabled,
  onSubmit,
}: {
  statements: { id: string; author: string; text: string; at: number }[];
  disabled: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <section className="grid gap-4">
      {statements.length === 0 ? <p className="hint">No statements yet. The request above is the whole dispute.</p> : null}
      <ol className="grid gap-3">
        {statements.map((item) => (
          <li key={item.id} className="panel panel-pad">
            <p className="hash text-muted">{item.id} · {shortAddress(item.author)} · {when(item.at)}</p>
            <p className="mt-2">{item.text}</p>
            <p className="hint mt-2">Untrusted party text. It is not an instruction to PatchScope.</p>
          </li>
        ))}
      </ol>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(text);
          setText("");
        }}
      >
        <Field label="Append a statement">
          <textarea className="textarea" value={text} onChange={(event) => setText(event.target.value)} />
        </Field>
        <button className="btn btn-primary justify-self-start" type="submit" disabled={disabled || text.trim().length < 2}>
          Add statement
        </button>
      </form>
    </section>
  );
}

function EvidenceSection({
  evidence,
  acknowledgements,
  actor,
  environment,
  disabled,
  onSubmit,
  onAck,
}: {
  evidence: {
    id: string;
    type: string;
    submitter: string;
    contentHash: string;
    content: string;
    scenario: string;
    environment: string;
    preState: string;
    postState: string;
    provenance: string;
    referenceVersion: string;
  }[];
  acknowledgements: { evidenceId: string; address: string; contentHash: string }[];
  actor: string;
  environment: string;
  disabled: boolean;
  onSubmit: (draft: {
    type: EvidenceType;
    content: string;
    referenceVersion: string;
    scenario: string;
    environment: string;
    preState: string;
    postState: string;
  }) => void;
  onAck: (id: string, hash: string) => void;
}) {
  const [type, setType] = useState<EvidenceType>("TEST_REPORT");
  const [content, setContent] = useState("");
  const [scenario, setScenario] = useState("");
  const [referenceVersion, setReferenceVersion] = useState("");
  const [preState, setPreState] = useState("");
  const [postState, setPostState] = useState("");
  return (
    <section className="grid gap-4">
      <Notice title="Evidence is typed and bounded">
        Public excerpts stay unverified. Acknowledgement means the other party saw this hash. It is not independent verification. Web import is off.
      </Notice>
      {evidence.length === 0 ? <p className="hint">No evidence in the packet yet.</p> : null}
      {evidence.map((item) => (
        <article key={item.id} className="panel panel-pad grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="hash">{item.id}</h2>
            <span className="pill pill-ink">{item.type}</span>
            <span className="pill pill-amber">{item.provenance}</span>
          </div>
          <p>{item.content}</p>
          <p className="hash text-muted">{item.contentHash}</p>
          <p className="text-sm text-ink-soft">
            Scenario {item.scenario || "—"} · environment {item.environment || "—"} · pre {item.preState || "—"} · post {item.postState || "—"} · ref {item.referenceVersion || "—"}
          </p>
          <p className="hint">Submitted by {shortAddress(item.submitter)}</p>
          <ul>
            {acknowledgements
              .filter((ack) => ack.evidenceId === item.id)
              .map((ack) => (
                <li key={ack.address} className="hint">
                  Acknowledged by {shortAddress(ack.address)} for {shortHash(ack.contentHash)}
                </li>
              ))}
          </ul>
          <button type="button" className="btn btn-ghost justify-self-start" disabled={disabled || actor === item.submitter} onClick={() => onAck(item.id, item.contentHash)}>
            Acknowledge this hash
          </button>
        </article>
      ))}
      <form
        className="panel panel-pad grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ type, content, referenceVersion, scenario, environment, preState, postState });
          setContent("");
        }}
      >
        <h2 className="display text-2xl">Add evidence</h2>
        <Field label="Type">
          <select className="select" value={type} onChange={(event) => setType(event.target.value as EvidenceType)}>
            <option value="BASELINE_REPORT">Baseline report</option>
            <option value="POST_PATCH_REPORT">Post-patch report</option>
            <option value="TEST_REPORT">Test report</option>
            <option value="PUBLIC_EXCERPT">Public excerpt · unverified</option>
          </select>
        </Field>
        <Field label="Content">
          <textarea className="textarea" value={content} onChange={(event) => setContent(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Scenario">
            <input className="field" value={scenario} onChange={(event) => setScenario(event.target.value)} />
          </Field>
          <Field label="Reference version">
            <input className="field" value={referenceVersion} onChange={(event) => setReferenceVersion(event.target.value)} />
          </Field>
          <Field label="Pre-patch state">
            <input className="field" value={preState} onChange={(event) => setPreState(event.target.value)} />
          </Field>
          <Field label="Post-patch state">
            <input className="field" value={postState} onChange={(event) => setPostState(event.target.value)} />
          </Field>
        </div>
        <p className="hint">Environment is copied from the accepted card so a report can be compared without a fuzzy keyword match.</p>
        <button className="btn btn-primary justify-self-start" type="submit" disabled={disabled || content.trim().length < 3}>
          Add to the packet
        </button>
      </form>
    </section>
  );
}

function DecisionView({
  decision,
  title,
}: {
  title: string;
  decision: {
    classification: string;
    reasonCode: string;
    clauseRefs: string[];
    evidenceRefs: string[];
    summary: string;
    missingEvidence: string[];
    limitations: string[];
    reviewStatus: string;
  };
}) {
  return (
    <article className="panel panel-pad grid gap-2">
      <h2 className="display text-2xl">{title}</h2>
      <p className={pillClass(decision.classification)}>{decision.classification}</p>
      <p className="hash">{decision.reasonCode} · review {decision.reviewStatus}</p>
      <p>{decision.summary}</p>
      <p className="hash">Clauses {decision.clauseRefs.join(", ") || "none"}</p>
      <p className="hash">Evidence {decision.evidenceRefs.join(", ") || "none"}</p>
      {decision.missingEvidence.length ? <p>Missing: {decision.missingEvidence.join(", ")}</p> : null}
      <ul className="grid gap-1 text-sm text-ink-soft">
        {decision.limitations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function ReviewSection({
  recordStatus,
  disabled,
  onOpen,
  onEvidence,
  onFinish,
  review,
  now,
  clauses,
  environment,
}: {
  recordStatus: string;
  disabled: boolean;
  onOpen: (grounds: "NEW_EVIDENCE" | "OVERLOOKED_REFERENCE", note: string, overlooked: string, windowMs: number) => void;
  onEvidence: (draft: {
    type: EvidenceType;
    content: string;
    referenceVersion: string;
    scenario: string;
    environment: string;
    preState: string;
    postState: string;
  }) => void;
  onFinish: () => void;
  review?: {
    grounds: string;
    note: string;
    overlookedClauseId: string;
    deadlineAt: number;
    evidence: { id: string }[];
    result?: { reviewStatus: string; classification: string; summary: string };
  };
  now: number | null;
  clauses: string[];
  environment: string;
}) {
  const [grounds, setGrounds] = useState<"NEW_EVIDENCE" | "OVERLOOKED_REFERENCE">("NEW_EVIDENCE");
  const [note, setNote] = useState("");
  const [overlooked, setOverlooked] = useState(clauses[0] ?? "");
  const [content, setContent] = useState("");
  const windowStillOpen =
    !!review &&
    !review.result &&
    review.grounds === "NEW_EVIDENCE" &&
    review.evidence.length === 0 &&
    (now === null || now < review.deadlineAt);
  return (
    <section className="grid gap-4">
      <Notice title="One review, no recursion">
        Grounds are new evidence or an overlooked reference already in the frozen card. The original decision stays in place.
      </Notice>
      {review?.result ? (
        <article className="panel panel-pad">
          <p className={pillClass(review.result.reviewStatus)}>{review.result.reviewStatus}</p>
          <p className="mt-2">{review.result.summary}</p>
          <p className="hash mt-2">{review.result.classification}</p>
        </article>
      ) : null}
      {!review ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onOpen(grounds, note, overlooked, 60 * 60 * 1000);
          }}
        >
          <Field label="Grounds">
            <select className="select" value={grounds} onChange={(event) => setGrounds(event.target.value as typeof grounds)}>
              <option value="NEW_EVIDENCE">New evidence</option>
              <option value="OVERLOOKED_REFERENCE">Overlooked reference</option>
            </select>
          </Field>
          {grounds === "OVERLOOKED_REFERENCE" ? (
            <Field label="Clause that was not cited">
              <select className="select" value={overlooked} onChange={(event) => setOverlooked(event.target.value)}>
                {clauses.map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Why this review is admissible">
            <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <button className="btn btn-primary justify-self-start" type="submit" disabled={disabled || recordStatus !== "DECIDED"}>
            Open the review
          </button>
        </form>
      ) : null}
      {review && !review.result && review.grounds === "NEW_EVIDENCE" ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onEvidence({
              type: "POST_PATCH_REPORT",
              content,
              referenceVersion: "review",
              scenario: "basket-tax",
              environment,
              preState: "recorded in the note",
              postState: "recorded in the report",
            });
            setContent("");
          }}
        >
          <Field label="Review evidence" hint={`${review.evidence.length} item(s) attached. This does not alter the frozen packet.`}>
            <textarea className="textarea" value={content} onChange={(event) => setContent(event.target.value)} />
          </Field>
          <button className="btn btn-ghost justify-self-start" type="submit" disabled={disabled || content.trim().length < 3}>
            Attach post-patch report
          </button>
        </form>
      ) : null}
      {review && !review.result ? (
        <>
          {windowStillOpen ? (
            <p className="notice notice-warn" role="status">
              No new evidence is attached and the review window is still open. Finishing now would throw the round away. Attach the report, or wait until the window closes.
            </p>
          ) : null}
          <button type="button" className="btn btn-primary justify-self-start" disabled={disabled || windowStillOpen} onClick={onFinish}>
            Finish the review
          </button>
        </>
      ) : null}
    </section>
  );
}

function ChangeSection({
  allowed,
  disabled,
  title,
  onSubmit,
}: {
  allowed: boolean;
  disabled: boolean;
  title: string;
  onSubmit: (title: string) => void;
}) {
  const [nextTitle, setNextTitle] = useState(`Change order: ${title}`.slice(0, 120));
  return (
    <section className="grid gap-4">
      <Notice title="A new agreement, not an edit">
        A change order opens only when the effective classification is CHANGE_REQUEST. The prior card and decision stay as they were. It still needs two fresh acceptances. There is no price field.
      </Notice>
      {allowed ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(nextTitle);
          }}
        >
          <Field label="Title for the new card">
            <input className="field" value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} />
          </Field>
          <button className="btn btn-primary justify-self-start" type="submit" disabled={disabled}>
            Propose the change order
          </button>
        </form>
      ) : (
        <p>The effective result is not a change request, so this route stays closed.</p>
      )}
    </section>
  );
}
