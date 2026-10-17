import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Notice, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { atomicityIssue, clauseMap, currentVersion } from "@/lib/patchscope/policy";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/case/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    agreementId: typeof search.agreementId === "string" ? search.agreementId : "",
  }),
  head: () => ({
    meta: [
      { title: "Open a request — PatchScope" },
      { name: "description", content: "Open one atomic disputed request against an accepted PatchScope card." },
    ],
  }),
  component: NewCasePage,
});

function NewCasePage() {
  const { agreementId } = Route.useSearch();
  const hydrated = useHydrated();
  const agreement = usePatchScope((state) => state.agreements.find((item) => item.id === agreementId));
  const createCase = usePatchScope((state) => state.createCase);
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [cited, setCited] = useState<string[]>([]);
  const [windowMs, setWindowMs] = useState(72 * 60 * 60 * 1000);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const warning = atomicityIssue(text);

  if (!hydrated) {
    return (
      <Shell variant="workspace">
        <Restore />
      </Shell>
    );
  }
  if (!agreement || agreement.status !== "ACCEPTED") {
    return (
      <Shell variant="workspace">
        <div className="wrap py-10">
          <Notice title="No accepted card selected">
            Open a request only from an agreement both parties have accepted. The id “{agreementId || "missing"}” is not an active card in this workspace.
          </Notice>
        </div>
      </Shell>
    );
  }
  const clauses = [...clauseMap(currentVersion(agreement).card).values()];

  async function submit() {
    setPending(true);
    const result = createCase(agreement!.id, text, cited, windowMs);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.id) {
      await navigate({ to: "/workspace/case/$caseId", params: { caseId: result.id }, search: { section: "request" } });
    }
  }

  return (
    <Shell variant="workspace">
      <form
        className="wrap grid gap-5 py-10"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <header>
          <p className="eyebrow">{agreement.id}</p>
          <h1 className="display text-4xl">One disputed request</h1>
          <p className="mt-2 text-ink-soft">Cite the clauses this single request is about. A numbered list of three demands will be refused.</p>
        </header>
        <Field label="Request" error={warning ?? undefined} hint="Plain language. Instructions inside the text are data, not policy.">
          <textarea className="textarea" value={text} onChange={(event) => setText(event.target.value)} required minLength={20} />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="font-semibold">Cited clauses</legend>
          {clauses.map((clause) => (
            <label key={clause.id} className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={cited.includes(clause.id)}
                onChange={(event) => {
                  setCited((current) =>
                    event.target.checked ? [...current, clause.id] : current.filter((id) => id !== clause.id),
                  );
                }}
              />
              <span>
                <span className="hash">{clause.id}</span> {clause.text}
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Response window" hint="The short window is only for exercising a local deadline. It is still this browser’s clock.">
          <select className="select" value={windowMs} onChange={(event) => setWindowMs(Number(event.target.value))}>
            <option value={2 * 60 * 1000}>2 minutes · local deadline exercise</option>
            <option value={60 * 60 * 1000}>1 hour</option>
            <option value={24 * 60 * 60 * 1000}>24 hours</option>
            <option value={72 * 60 * 60 * 1000}>72 hours</option>
          </select>
        </Field>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <button type="submit" className="btn btn-primary justify-self-start" disabled={pending || Boolean(warning)}>
          {pending ? "Opening…" : "Open the case"}
        </button>
      </form>
    </Shell>
  );
}
