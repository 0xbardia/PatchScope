import { createFileRoute } from "@tanstack/react-router";
import { Empty, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { shortAddress, when } from "@/lib/patchscope/format";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/activity")({
  head: () => ({
    meta: [
      { title: "Activity — PatchScope" },
      { name: "description", content: "Local activity for this browser workspace. Not a chain log." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const hydrated = useHydrated();
  const activity = usePatchScope((state) => state.activity);
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
        <header>
          <p className="eyebrow">This browser</p>
          <h1 className="display text-4xl">Activity</h1>
          <p className="lede mt-3">Lines stay on this device. They are not a transaction log and they are not consensus.</p>
        </header>
        {activity.length === 0 ? (
          <Empty title="No local actions yet">Write a scope card. Each propose, accept, freeze, and decision leaves a line here.</Empty>
        ) : (
          <ol className="grid gap-2">
            {activity.map((item) => (
              <li key={item.id} className="panel panel-pad">
                <p className="font-semibold">{item.summary}</p>
                <p className="hash mt-1 text-muted">
                  {item.action} · {shortAddress(item.actor)} · {when(item.at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Shell>
  );
}
