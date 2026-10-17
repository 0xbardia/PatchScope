import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return <Outlet />;
}
