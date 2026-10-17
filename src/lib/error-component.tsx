import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory px-6 text-center text-ink">
      <TriangleAlert className="size-10 text-terracotta" aria-hidden="true" />
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="max-w-md text-ink-soft break-words">{errorMessage(error)}</p>
      <Link to="/" className="btn btn-primary">
        Back to PatchScope
      </Link>
    </main>
  );
}
