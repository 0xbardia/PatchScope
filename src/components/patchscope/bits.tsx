import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="label">
      <span>{label}</span>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Notice({
  tone = "plain",
  title,
  children,
}: {
  tone?: "plain" | "warn";
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className={tone === "warn" ? "notice notice-warn" : "notice"}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-ink-soft">{children}</div>
    </aside>
  );
}

export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="display text-3xl">{title}</p>
      <div className="mt-2 max-w-[65ch] text-ink-soft">{children}</div>
    </div>
  );
}

export function Restore() {
  return (
    <div className="wrap restore" role="status">
      <span className="sr-only">Restoring this browser’s workspace…</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
    </div>
  );
}
