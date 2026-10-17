import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Field, Notice, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { DEMO_CLIENT, DEMO_DEVELOPER, emptyCard, exampleCard } from "@/lib/patchscope/example";
import { agreementHash, validateScope, type Clause, type ScopeCard } from "@/lib/patchscope/policy";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/new")({
  head: () => ({
    meta: [
      { title: "New scope card — PatchScope" },
      { name: "description", content: "Write a two-party PatchScope card and propose an exact version." },
    ],
  }),
  component: WizardPage,
});

function WizardPage() {
  const hydrated = useHydrated();
  const propose = usePatchScope((state) => state.propose);
  const saveDraft = usePatchScope((state) => state.saveDraft);
  const actor = usePatchScope((state) => state.actor);
  const navigate = useNavigate();
  const [developer, setDeveloper] = useState(DEMO_DEVELOPER);
  const [client, setClient] = useState(DEMO_CLIENT);
  const [card, setCard] = useState<ScopeCard>(emptyCard);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");
  const [hash, setHash] = useState("");
  const [pending, setPending] = useState(false);
  const revision = useRef(0);

  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      const result = saveDraft("composer", { developer, client, card }, revision.current);
      if (result.ok) {
        revision.current += 1;
        setConflict("");
      } else if (result.code === "DRAFT_CONFLICT") {
        setConflict(result.message);
      }
    }, 700);
    return () => window.clearTimeout(handle);
  }, [hydrated, developer, client, card, saveDraft]);

  useEffect(() => {
    let alive = true;
    validateAndHash(card).then((value) => {
      if (alive) setHash(value);
    });
    return () => {
      alive = false;
    };
  }, [card]);

  async function onPropose() {
    setPending(true);
    setError("");
    const result = await propose(card, developer, client);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.id) {
      await navigate({ to: "/workspace/agreement/$agreementId", params: { agreementId: result.id } });
    }
  }

  if (!hydrated) {
    return (
      <Shell variant="workspace">
        <Restore />
      </Shell>
    );
  }

  return (
    <Shell variant="workspace">
      <div className="wrap grid gap-6 py-10">
        <header>
          <p className="eyebrow">Agreement wizard</p>
          <h1 className="display text-4xl">Write the scope before the work</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            You are proposing as <span className="hash">{actor()}</span>. The other party still has to accept this
            exact hash. A team seat cannot propose for an address it does not hold.
          </p>
        </header>
        {conflict ? (
          <Notice tone="warn" title="Draft conflict">
            {conflict}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                const current = usePatchScope.getState().drafts.composer?.revision ?? 0;
                revision.current = current;
                setConflict("");
              }}
            >
              Continue from the saved revision
            </button>
          </Notice>
        ) : (
          <p className="hint" role="status">
            Draft revision {revision.current} autosaves in this browser.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setCard(exampleCard);
              setDeveloper(DEMO_DEVELOPER);
              setClient(DEMO_CLIENT);
            }}
          >
            Load the labelled example
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Developer address" hint="Demo developer is prefilled. Replace it with a real 0x address if you have one.">
            <input className="field hash" value={developer} onChange={(event) => setDeveloper(event.target.value)} />
          </Field>
          <Field label="Client address">
            <input className="field hash" value={client} onChange={(event) => setClient(event.target.value)} />
          </Field>
        </div>
        <Field label="Title">
          <input className="field" value={card.title} onChange={(event) => patch(setCard, { title: event.target.value })} />
        </Field>
        <Field label="Broken behavior">
          <textarea className="textarea" value={card.brokenBehavior} onChange={(event) => patch(setCard, { brokenBehavior: event.target.value })} />
        </Field>
        <Field label="Expected behavior">
          <textarea className="textarea" value={card.expectedBehavior} onChange={(event) => patch(setCard, { expectedBehavior: event.target.value })} />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Environment / platform">
            <input className="field" value={card.environment} onChange={(event) => patch(setCard, { environment: event.target.value })} />
          </Field>
          <Field label="Baseline version">
            <input className="field" value={card.baselineVersion} onChange={(event) => patch(setCard, { baselineVersion: event.target.value })} />
          </Field>
        </div>
        <ClauseList title="Included · S-*" kind="S" clauses={card.included} onChange={(included) => patch(setCard, { included })} />
        <ClauseList title="Excluded · X-*" kind="X" clauses={card.excluded} onChange={(excluded) => patch(setCard, { excluded })} />
        <ClauseList title="Acceptance · A-*" kind="A" clauses={card.acceptance} onChange={(acceptance) => patch(setCard, { acceptance })} />
        <ClauseList title="Protected · P-*" kind="P" clauses={card.protected} onChange={(protectedClauses) => patch(setCard, { protected: protectedClauses })} />
        <section className="panel panel-pad">
          <h2 className="display text-2xl">Canonical hash</h2>
          <p className="hash mt-2">{hash || "Complete the required fields to preview the hash."}</p>
          <p className="hint mt-2">Acceptance later must match this hash. Editing the card changes it.</p>
        </section>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void onPropose()}>
            {pending ? "Proposing…" : "Propose this version"}
          </button>
          <Link to="/workspace" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function patch(setCard: (fn: (card: ScopeCard) => ScopeCard) => void, partial: Partial<ScopeCard>) {
  setCard((card) => ({ ...card, ...partial }));
}

async function validateAndHash(card: ScopeCard): Promise<string> {
  try {
    return agreementHash(validateScope(card));
  } catch {
    return "";
  }
}

function ClauseList({
  title,
  kind,
  clauses,
  onChange,
}: {
  title: string;
  kind: "S" | "X" | "A" | "P";
  clauses: Clause[];
  onChange: (clauses: Clause[]) => void;
}) {
  return (
    <fieldset className="panel panel-pad grid gap-3">
      <legend className="font-semibold">{title}</legend>
      {clauses.map((clause, index) => (
        <div key={`${kind}-${index}`} className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <input
              className="field hash"
              aria-label={`${kind} id ${index + 1}`}
              value={clause.id}
              onChange={(event) => update(clauses, index, { id: event.target.value }, onChange)}
            />
            <textarea
              className="textarea"
              aria-label={`${kind} text ${index + 1}`}
              value={clause.text}
              onChange={(event) => update(clauses, index, { text: event.target.value }, onChange)}
            />
            <button type="button" className="btn btn-ghost" onClick={() => onChange(clauses.filter((_, item) => item !== index))}>
              Remove
            </button>
          </div>
          {kind === "P" ? (
            <input
              className="field"
              aria-label={`Scenario for ${clause.id || "protected clause"}`}
              placeholder="Scenario id, for example guest-eu-vat"
              value={clause.scenario}
              onChange={(event) => update(clauses, index, { scenario: event.target.value }, onChange)}
            />
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost justify-self-start"
        onClick={() => onChange([...clauses, { id: nextId(kind, clauses), text: "", scenario: "" }])}
      >
        Add {kind} clause
      </button>
    </fieldset>
  );
}

function update(clauses: Clause[], index: number, partial: Partial<Clause>, onChange: (clauses: Clause[]) => void) {
  onChange(clauses.map((clause, item) => (item === index ? { ...clause, ...partial } : clause)));
}

function nextId(kind: string, clauses: Clause[]): string {
  const numbers = clauses.map((clause) => Number(clause.id.split("-")[1] || 0));
  return `${kind}-${Math.max(0, ...numbers) + 1}`;
}
