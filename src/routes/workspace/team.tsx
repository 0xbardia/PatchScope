import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Notice, Restore } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { shortAddress } from "@/lib/patchscope/format";
import { useHydrated, usePatchScope } from "@/lib/patchscope/store";

export const Route = createFileRoute("/workspace/team")({
  head: () => ({
    meta: [
      { title: "Team — PatchScope" },
      { name: "description", content: "Local PatchScope workspace owner, members, and the limit of a team seat." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const hydrated = useHydrated();
  const team = usePatchScope((state) => state.team);
  const actor = usePatchScope((state) => state.actor());
  const invite = usePatchScope((state) => state.invite);
  const removeMember = usePatchScope((state) => state.removeMember);
  const renameTeam = usePatchScope((state) => state.renameTeam);
  const resetWorkspace = usePatchScope((state) => state.resetWorkspace);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");

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
          <p className="eyebrow">Workspace</p>
          <h1 className="display text-4xl">{team.name}</h1>
        </header>
        <Notice title="A seat is not a signature">
          Inviting or removing someone changes this local team only. It does not delete a wallet session, and it does not remove that address from any other team. Only a party address can accept a card.
        </Notice>
        <p>Owner <span className="hash">{team.owner}</span> · you are {shortAddress(actor)}</p>
        <ul className="grid gap-2">
          {team.members.length === 0 ? <li className="hint">No members besides the owner.</li> : null}
          {team.members.map((member) => (
            <li key={member} className="panel panel-pad flex flex-wrap items-center justify-between gap-2">
              <span className="hash">{member}</span>
              <button type="button" className="btn btn-danger" onClick={() => setMessage(removeMember(member).ok ? "Removed from this team only." : "Not removed.")}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const result = invite(address);
            setMessage(result.ok ? "Invitation recorded locally." : result.message);
            if (result.ok) setAddress("");
          }}
        >
          <Field label="Invite an address">
            <input className="field hash" value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <button className="btn btn-primary justify-self-start" type="submit">Invite</button>
        </form>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const result = renameTeam(name);
            setMessage(result.ok ? "Workspace renamed." : result.message);
          }}
        >
          <Field label="Workspace name">
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <button className="btn btn-ghost justify-self-start" type="submit">Rename</button>
        </form>
        <section className="notice notice-warn grid gap-3">
          <h2 className="font-semibold">Clear this browser’s workspace</h2>
          <p>Type RESET. This deletes local drafts, agreements, and cases. It does not send a transaction.</p>
          <input className="field" value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-label="Type RESET to confirm" />
          <button
            type="button"
            className="btn btn-danger justify-self-start"
            disabled={confirm !== "RESET"}
            onClick={() => {
              resetWorkspace();
              setMessage("Local workspace cleared.");
              setConfirm("");
            }}
          >
            Clear local workspace
          </button>
        </section>
        {message ? <p role="status">{message}</p> : null}
      </div>
    </Shell>
  );
}
