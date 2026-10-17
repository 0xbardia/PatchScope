import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { shortAddress } from "@/lib/patchscope/format";
import { usePatchScope } from "@/lib/patchscope/store";
import { useWeb3Ready } from "./web3-frame";

const HeaderWallet = lazy(() => import("./wallet-bar").then((mod) => ({ default: mod.HeaderWallet })));
const WorkspaceWallet = lazy(() => import("./wallet-bar").then((mod) => ({ default: mod.WorkspaceWallet })));

const marketingLinks = [
  { to: "/docs", label: "Docs" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/security", label: "Security" },
  { to: "/privacy", label: "Privacy" },
  { to: "/workspace", label: "Ledger" },
] as const;

const workspaceLinks = [
  { to: "/workspace", label: "Ledger" },
  { to: "/workspace/new", label: "New card" },
  { to: "/workspace/team", label: "Parties" },
  { to: "/workspace/activity", label: "Activity" },
  { to: "/workspace/notifications", label: "Notices" },
  { to: "/workspace/diagnostics", label: "Reads" },
] as const;

export function Shell({
  variant,
  children,
}: {
  variant: "marketing" | "workspace";
  children: ReactNode;
}) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const links = variant === "marketing" ? marketingLinks : workspaceLinks;
  const role = usePatchScope((state) => state.activeRole);
  const setRole = usePatchScope((state) => state.setRole);
  const persona = usePatchScope((state) => state.personas[role]);
  const web3Ready = useWeb3Ready();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const wallet = web3Ready ? (
    <Suspense fallback={<span className="btn btn-ghost wallet-slot">Connect</span>}>
      <HeaderWallet />
    </Suspense>
  ) : (
    <span className="btn btn-ghost wallet-slot">Connect</span>
  );

  return (
    <>
      <header className="masthead">
        <div className="wrap masthead-row">
          <Link to="/" className="brand" onClick={() => setOpen(false)}>
            <span className="crop" aria-hidden="true" />
            <span className="brand-name">PatchScope</span>
          </Link>
          <nav className="desk-nav" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="nav-link"
                activeOptions={{ exact: link.to === "/workspace" }}
                activeProps={{ "aria-current": "page" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="masthead-tools">
            <Link to="/workspace/new" className="btn btn-ink desk-only">
              New card
            </Link>
            {wallet}
            <button
              type="button"
              className="btn btn-ghost menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="menu-icon">
                <Menu className={open ? "menu-glyph menu-glyph-off" : "menu-glyph"} aria-hidden="true" />
                <X className={open ? "menu-glyph" : "menu-glyph menu-glyph-off"} aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
        <div className={open ? "sheet-clip open" : "sheet-clip"}>
          <div className="sheet-inner" inert={open ? undefined : true}>
            <nav id="mobile-nav" className="wrap sheet-nav" aria-label="Mobile">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="nav-link"
                  activeOptions={{ exact: link.to === "/workspace" }}
                  activeProps={{ "aria-current": "page" }}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/workspace/new" className="btn btn-ink" onClick={() => setOpen(false)}>
                New card
              </Link>
            </nav>
          </div>
        </div>
      </header>
      {variant === "workspace" ? (
        <div className="rolebar">
          <div className="wrap rolebar-row">
            <div className="role-switch" role="group" aria-label="Acting persona">
              {(["developer", "client"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === role ? "role-pill on" : "role-pill"}
                  aria-pressed={item === role}
                  onClick={() => setRole(item)}
                >
                  {item === "developer" ? "Developer" : "Client"}
                </button>
              ))}
            </div>
            <p className="hash role-meta">
              {persona.kind === "demo" ? "Demo" : "Wallet"} · {shortAddress(persona.address)}
            </p>
            {web3Ready ? (
              <Suspense fallback={null}>
                <WorkspaceWallet />
              </Suspense>
            ) : null}
          </div>
        </div>
      ) : null}
      <main id="content" className="flex-1">
        {children}
      </main>
      {variant === "marketing" && path !== "/" ? (
        <section className="wrap cta-band">
          <h2 className="display">Write the card before the work.</h2>
          <p className="lede">Same action as the front page. The other party still accepts the exact hash.</p>
          <div className="hero-actions">
            <Link to="/workspace/new" className="btn btn-ink">
              Write a scope card
            </Link>
          </div>
        </section>
      ) : null}
      <footer className="colophon">
        <div className="wrap colophon-row">
          <p>Scope only. No payment, no liability, no verdict on who is telling the truth.</p>
          <p>
            Self-reviewed. Not an audit.{" "}
            <Link to="/security" className="text-link">
              Security
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
