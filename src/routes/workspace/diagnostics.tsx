import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Field, Notice } from "@/components/patchscope/bits";
import { Shell } from "@/components/patchscope/shell";
import { POLICY_HASH, POLICY_VERSION } from "@/lib/patchscope/policy";
import { STUDIONET_CHAIN_ID, STUDIONET_RPC, DEPLOYED_PATCHSCOPE_ADDRESS } from "@/lib/patchscope/network";

const READS = [
  "get_policy()",
  "get_agreement(id)",
  "list_agreements(cursor, limit)",
  "get_case(id)",
  "list_cases(cursor, limit)",
  "get_packet(case_id)",
  "get_decision(case_id)",
];

export const Route = createFileRoute("/workspace/diagnostics")({
  head: () => ({
    meta: [
      { title: "Contract reads — PatchScope" },
      { name: "description", content: "Public read diagnostics for a configured PatchScope contract. No write is sent from this page." },
    ],
  }),
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  const configuredRpc = import.meta.env.VITE_GENLAYER_RPC_URL?.trim() ?? "";
  const rpc = configuredRpc || STUDIONET_RPC;
  const contract = import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS?.trim() || DEPLOYED_PATCHSCOPE_ADDRESS;
  const chain = import.meta.env.VITE_GENLAYER_CHAIN_ID?.trim() || String(STUDIONET_CHAIN_ID);
  const walletConnect = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  const [hash, setHash] = useState("");
  const [output, setOutput] = useState("No read yet.");
  const [pending, setPending] = useState(false);

  async function readChain() {
    if (!rpc) {
      setOutput("No RPC is configured. This page will not invent an endpoint or a transaction hash.");
      return;
    }
    setPending(true);
    try {
      const chainId = await rpcCall(rpc, "eth_chainId", []);
      const returned = String(chainId);
      const returnedDec = returned.startsWith("0x") ? Number.parseInt(returned, 16) : Number(returned);
      const expected = Number(chain);
      const matches = Number.isFinite(returnedDec) && returnedDec === expected;
      setOutput(
        matches
          ? `eth_chainId returned ${returned}, which is ${returnedDec} and matches the expected Studionet id. This is a node read, not a contract view and not a write.`
          : `eth_chainId returned ${returned} (${returnedDec}). Expected ${expected}. The node and the configured chain differ. No write was attempted.`,
      );
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "The RPC read failed. No write was attempted.");
    } finally {
      setPending(false);
    }
  }

  async function readContractPolicy() {
    if (!contract) return;
    setPending(true);
    try {
      const { createClient } = await import("genlayer-js");
      const { studionet } = await import("genlayer-js/chains");
      const client = createClient({ chain: studionet, endpoint: rpc });
      const value = await client.readContract({
        address: contract as `0x${string}`,
        functionName: "get_policy",
        args: [],
      });
      setOutput(`Contract ${contract} get_policy() on Studionet:\n\n${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`);
    } catch (err) {
      setOutput(`Read error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPending(false);
    }
  }

  async function readAllViews() {
    if (!contract) return;
    setPending(true);
    try {
      const { createClient } = await import("genlayer-js");
      const { studionet } = await import("genlayer-js/chains");
      const client = createClient({ chain: studionet, endpoint: rpc });
      const runs: Array<{ label: string; status: "PASS" | "REVERT"; data: string }> = [];

      async function runView(label: string, fn: string, args: (string | number | boolean)[]) {
        try {
          const res = await client.readContract({
            address: contract as `0x${string}`,
            functionName: fn,
            args: args as any,
          });
          runs.push({ label, status: "PASS", data: typeof res === "string" ? res : JSON.stringify(res) });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          runs.push({ label, status: "REVERT", data: msg.includes("execution failed") ? "Reverted: execution failed (expected for missing/empty IDs or boundary inputs)" : msg });
        }
      }

      await runView("1. get_policy()", "get_policy", []);
      await runView("2. list_agreements('', 10)", "list_agreements", ["", 10]);
      await runView("3. list_cases('', 10)", "list_cases", ["", 10]);
      await runView("4. get_agreement('agr-missing')", "get_agreement", ["agr-missing"]);
      await runView("5. get_case('case-missing')", "get_case", ["case-missing"]);
      await runView("6. get_decision('case-missing')", "get_decision", ["case-missing"]);
      await runView("7. get_packet('case-missing')", "get_packet", ["case-missing"]);

      const formatted = runs.map((r) => `[${r.status}] ${r.label}\n  -> ${r.data}`).join("\n\n");
      setOutput(`Contract ${contract} 7-View Diagnostics:\n\n${formatted}`);
    } catch (err) {
      setOutput(`Diagnostics error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPending(false);
    }
  }

  async function readReceipt() {
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash.trim())) {
      setOutput("Enter a 32-byte transaction hash. PatchScope will not create one.");
      return;
    }
    if (!rpc) {
      setOutput("No RPC is configured, so the hash cannot be checked. The hash is kept in the field.");
      return;
    }
    setPending(true);
    try {
      const tx = await rpcCall(rpc, "eth_getTransactionByHash", [hash.trim()]);
      const receipt = await rpcCall(rpc, "eth_getTransactionReceipt", [hash.trim()]);
      const status = classifyReceipt(tx, receipt);
      setOutput(`${status}\n\nTransaction: ${JSON.stringify(tx, null, 2)}\n\nReceipt: ${JSON.stringify(receipt, null, 2)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Read failed.";
      if (/not found/i.test(message)) {
        setOutput("Unknown. The node has no transaction for that hash. No write was attempted.");
        return;
      }
      setOutput(`Read failed. The hash is unchanged. ${message}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell variant="workspace">
      <div className="wrap grid max-w-3xl gap-5 py-10">
        <header>
          <p className="eyebrow">Public reads</p>
          <h1 className="display text-4xl">Contract diagnostics</h1>
        </header>
        <Notice tone="warn" title="Configuration">
          Policy {POLICY_VERSION} · {POLICY_HASH}. Contract {contract || "not configured — views stay blocked"}. RPC {configuredRpc || `${STUDIONET_RPC} (public Studionet)`}. Chain id hint {chain}. WalletConnect {walletConnect ? "present" : "not configured, and none was invented"}.
        </Notice>
        <section>
          <h2 className="display text-2xl">Views</h2>
          <ul className="mt-3 grid gap-2">
            {READS.map((item) => (
              <li key={item} className="hash panel panel-pad">
                {item}
                <span className="mt-1 block text-muted">
                  {contract ? "Address is set, but this preview does not encode a call without a deployed ABI binding." : "Blocked: no contract address."}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => void readChain()}>
            {pending ? "Reading…" : "Read node chain id"}
          </button>
          <button type="button" className="btn btn-primary" disabled={pending || !contract} onClick={() => void readContractPolicy()}>
            {pending ? "Reading…" : "Read get_policy() on-chain"}
          </button>
          <button type="button" className="btn btn-primary" disabled={pending || !contract} onClick={() => void readAllViews()}>
            {pending ? "Reading…" : "Run all 7 views on-chain"}
          </button>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void readReceipt();
          }}
        >
          <Field label="Check an existing transaction hash" hint="Receipt status 0x1 is execution successful at the node. It is not, by itself, Optimistic Democracy finality. Status 0x0 is execution failed. A transaction without a receipt stays submitted / unknown.">
            <input className="field hash" value={hash} onChange={(event) => setHash(event.target.value)} />
          </Field>
          <button className="btn btn-ghost justify-self-start" type="submit" disabled={pending}>
            Check hash
          </button>
        </form>
        <pre className="panel panel-pad hash whitespace-pre-wrap">{output}</pre>
      </div>
    </Shell>
  );
}

async function rpcCall(rpc: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}.`);
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(body.error.message || "RPC error");
  return body.result ?? null;
}

function classifyReceipt(tx: unknown, receipt: unknown): string {
  if (!tx) return "Unknown. The node has no transaction for that hash.";
  if (!receipt || typeof receipt !== "object") return "Submitted. The transaction is known and no receipt was returned.";
  const status = (receipt as { status?: string }).status;
  if (status === "0x1" || status === "0x01") return "Execution successful, as reported by this receipt. Finality beyond the receipt is not claimed.";
  if (status === "0x0" || status === "0x00") return "Execution failed, as reported by this receipt.";
  return "Unknown receipt state. The raw payload is below.";
}
