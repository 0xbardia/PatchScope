import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Empty, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { pillClass, shortHash, when } from "@/lib/patchscope/format";
import { paginate, type Agreement, type CaseRecord } from "@/lib/patchscope/policy";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PatchScope" },
      { name: "description", content: "Local PatchScope workspace for agreements and cases. Not chain truth." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const hydrated = useHydrated();
  const agreements = usePatchScope((state) => state.agreements);
  const cases = usePatchScope((state) => state.cases);
  const team = usePatchScope((state) => state.team);
  if (!hydrated) {
    return (
      <Shell variant="workspace">
        <Restore />
      </Shell>
    );
  }
  return (
    <Shell variant="workspace">
      <div className="wrap grid gap-8 py-10">
        <header>
          <p className="eyebrow">{team.name}</p>
          <h1 className="display mt-2 text-4xl">Agreements and cases</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Records here are off-chain drafts and local decisions. They are not a GenLayer result until a
            configured contract says so.
          </p>
        </header>
        <RecordList title="Agreements" items={agreements} kind="agreement" empty="No scope card yet." />
        <RecordList title="Cases" items={cases} kind="case" empty="No disputed request yet." />
      </div>
    </Shell>
  );
}

function RecordList({
  title,
  items,
  kind,
  empty,
}: {
  title: string;
  items: Agreement[] | CaseRecord[];
  kind: "agreement" | "case";
  empty: string;
}) {
  const [limit, setLimit] = useState(10);
  const [cursor, setCursor] = useState("");
  const [previous, setPrevious] = useState<string[]>([]);
  const page = useMemo(() => {
    const rows = items as { id: string; createdAt: number }[];
    try {
      return paginate(rows, cursor, limit);
    } catch {
      return paginate(rows, "", limit);
    }
  }, [items, cursor, limit]);

  return (
    <section aria-labelledby={`${kind}-heading`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 id={`${kind}-heading`} className="display text-3xl">
          {title}
        </h2>
        <label className="label text-sm">
          Page size
          <select
            className="select"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setCursor("");
              setPrevious([]);
            }}
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      {items.length === 0 ? (
        <Empty title={empty}>
          {kind === "agreement" ? (
            <Link to="/workspace/new" className="text-link mt-3 inline-flex font-semibold underline">
              Open a scope card
            </Link>
          ) : (
            "Accept an agreement first, then open one request against it."
          )}
        </Empty>
      ) : (
        <div className="grid gap-3">
          {page.items.map((item) =>
            kind === "agreement" ? (
              <AgreementRow key={item.id} item={item as Agreement} />
            ) : (
              <CaseRow key={item.id} item={item as unknown as CaseRecord} />
            ),
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={previous.length === 0}
              onClick={() => {
                const stack = [...previous];
                const prior = stack.pop() ?? "";
                setPrevious(stack);
                setCursor(prior);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!page.nextCursor}
              onClick={() => {
                if (!page.nextCursor) return;
                setPrevious((stack) => [...stack, cursor]);
                setCursor(page.nextCursor);
              }}
            >
              Next
            </button>
            <p className="hint self-center">
              {page.nextCursor ? `More after ${page.nextCursor}` : "End of this list"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function AgreementRow({ item }: { item: Agreement }) {
  const version = item.versions[item.versions.length - 1];
  return (
    <Link
      to="/workspace/agreement/$agreementId"
      params={{ agreementId: item.id }}
      className="panel panel-pad block text-ink no-underline"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">{version?.card.title ?? item.id}</h3>
        <span className={pillClass(item.status)}>{item.status}</span>
      </div>
      <p className="hash mt-2 text-muted">
        {item.id} · v{version?.version} · {version ? shortHash(version.hash) : "no hash"} · {when(item.createdAt)}
      </p>
    </Link>
  );
}

function CaseRow({ item }: { item: CaseRecord }) {
  return (
    <Link
      to="/workspace/case/$caseId"
      params={{ caseId: item.id }}
      search={{ section: "request" }}
      className="panel panel-pad block text-ink no-underline"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">{item.requestText.slice(0, 90)}</h3>
        <span className={pillClass(item.status)}>{item.status}</span>
      </div>
      <p className="hash mt-2 text-muted">
        {item.id} · cites {item.citedClauseIds.join(", ")} · {when(item.createdAt)}
      </p>
    </Link>
  );
}
