import { createFileRoute } from "@tanstack/react-router";
import { Notice, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/notifications")({
  head: () => ({
    meta: [
      { title: "Notices — PatchScope" },
      { name: "description", content: "In-app notice preferences. PatchScope does not collect an email address." },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  const hydrated = useHydrated();
  const prefs = usePatchScope((state) => state.prefs);
  const setPrefs = usePatchScope((state) => state.setPrefs);
  if (!hydrated) {
    return (
      <Shell variant="workspace">
        <Restore />
      </Shell>
    );
  }
  return (
    <Shell variant="workspace">
      <div className="wrap grid max-w-3xl gap-5 py-10">
        <h1 className="display text-4xl">Notices</h1>
        <Notice title="No email path">
          PatchScope does not ask for an email address. There is no delivery vendor in v1, so collecting one would only store data we cannot use.
        </Notice>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={prefs.inAppActivity}
            onChange={(event) => setPrefs({ ...prefs, inAppActivity: event.target.checked })}
          />
          Keep a local activity line when I act
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={prefs.inAppDecisions}
            onChange={(event) => setPrefs({ ...prefs, inAppDecisions: event.target.checked })}
          />
          Keep a local line when a decision is recorded
        </label>
      </div>
    </Shell>
  );
}
