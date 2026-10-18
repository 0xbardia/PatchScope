import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { assertConfiguredContractAddress, STUDIONET_CHAIN_ID, STUDIONET_RPC } from "./network.ts";

export type ChainTxStatus =
  | "IDLE"
  | "PENDING_WALLET"
  | "SUBMITTED"
  | "ACCEPTED"
  | "FINALIZED"
  | "REVERTED"
  | "FAILED"
  | "TIMEOUT";

export interface ChainTxRecord {
  txHash: string;
  method: string;
  args: unknown[];
  status: ChainTxStatus;
  submittedAt: number;
  confirmedAt?: number;
  error?: string;
  consensusResult?: string;
  validatorVotes?: string[];
  entityId?: string;
}

export interface InjectedEthereumProvider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
}

export class ContractAdapterError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ContractAdapterError";
    this.code = code;
    this.details = details;
  }
}

/** Check if an injected EIP-1193 Ethereum provider is available in the window. */
export function getInjectedProvider(): InjectedEthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: InjectedEthereumProvider }).ethereum;
  return eth ?? null;
}

/** Verify provider chain ID matches Studionet (61999 / 0xf22f). */
export async function assertStudionetChain(provider: InjectedEthereumProvider): Promise<void> {
  const chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
  const decId = chainIdHex?.startsWith("0x") ? Number.parseInt(chainIdHex, 16) : Number(chainIdHex);
  if (decId !== STUDIONET_CHAIN_ID) {
    // Attempt switch
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${STUDIONET_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchErr) {
      throw new ContractAdapterError(
        "WRONG_NETWORK",
        `Wallet is on chain ${decId}. Please switch network to GenLayer Studionet (Chain ID ${STUDIONET_CHAIN_ID}).`,
        switchErr,
      );
    }
  }
}

/** Create a typed genlayer-js client for Studionet contract writes using injected wallet. */
export function createGenLayerWriteClient(provider: InjectedEthereumProvider) {
  return createClient({
    chain: studionet,
    endpoint: STUDIONET_RPC,
    provider,
  });
}

/** Execute a contract write and return transaction tracking record. */
export async function executeContractWrite(
  provider: InjectedEthereumProvider,
  accountAddress: string,
  functionName: string,
  args: (string | number | boolean | unknown[])[],
  entityId?: string,
  contractAddress?: string,
): Promise<ChainTxRecord> {
  let targetAddress: `0x${string}`;
  try {
    targetAddress = assertConfiguredContractAddress(contractAddress);
  } catch (configErr) {
    throw new ContractAdapterError(
      "CONFIG_ERROR",
      configErr instanceof Error ? configErr.message : "Contract address is not configured.",
      configErr,
    );
  }

  await assertStudionetChain(provider);

  const client = createGenLayerWriteClient(provider);
  let txHash: string;

  try {
    const rawHash = await client.writeContract({
      address: targetAddress,
      functionName,
      args: args as any,
      account: { address: accountAddress as `0x${string}` } as any,
      value: 0n,
      leaderOnly: false,
    });
    txHash = String(rawHash);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("4001") ||
      msg.toLowerCase().includes("user rejected") ||
      msg.toLowerCase().includes("denied")
    ) {
      throw new ContractAdapterError(
        "USER_REJECTED",
        "Transaction was rejected in the wallet.",
        err,
      );
    }
    if (msg.includes("BLOCKED_BY_SAFETY_GUARD")) {
      throw new ContractAdapterError("SAFETY_GUARD_BLOCKED", msg, err);
    }
    throw new ContractAdapterError("SUBMISSION_FAILED", `Failed to send transaction: ${msg}`, err);
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new ContractAdapterError(
      "INVALID_TX_HASH",
      `Invalid transaction hash returned: ${txHash}`,
    );
  }

  return {
    txHash,
    method: functionName,
    args,
    status: "SUBMITTED",
    submittedAt: Date.now(),
    entityId,
  };
}

/** Poll transaction status and extract verified consensus outcome. Never infers success without node confirmation. */
export async function pollTransactionStatus(
  txHash: string,
  maxAttempts: number = 30,
  intervalMs: number = 3000,
  onProgress?: (status: ChainTxStatus, attempts: number) => void,
): Promise<{
  status: ChainTxStatus;
  confirmedAt?: number;
  error?: string;
  consensusResult?: string;
  validatorVotes?: string[];
}> {
  const client = createClient({
    chain: studionet,
    endpoint: STUDIONET_RPC,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onProgress?.("SUBMITTED", attempt);
    try {
      const tx = await client.getTransaction({ hash: txHash as any });
      if (tx) {
        const statusName = String(tx.statusName || "").toUpperCase();
        const consensusVotes = tx.lastRound?.validatorVotesName;
        const consensusResult = tx.lastRound?.result ? String(tx.lastRound.result) : undefined;

        if (statusName === "FINALIZED" || statusName === "ACCEPTED") {
          // Check execution result
          const execRes = tx.txExecutionResult;
          if (execRes !== undefined && execRes !== 0 && execRes !== 1) {
            return {
              status: "REVERTED",
              confirmedAt: Date.now(),
              error: `Transaction execution failed on-chain with code ${execRes}`,
              consensusResult,
              validatorVotes: consensusVotes,
            };
          }
          return {
            status: statusName === "FINALIZED" ? "FINALIZED" : "ACCEPTED",
            confirmedAt: Date.now(),
            consensusResult,
            validatorVotes: consensusVotes,
          };
        }

        if (statusName === "REVERTED" || statusName === "FAILED") {
          return {
            status: "REVERTED",
            confirmedAt: Date.now(),
            error: "Transaction reverted by contract rules on Studionet.",
            consensusResult,
            validatorVotes: consensusVotes,
          };
        }
      }
    } catch {
      // RPC transient error, continue polling
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return {
    status: "TIMEOUT",
    error: `Transaction ${txHash} did not reach consensus within timeout. Status remains unknown on node.`,
  };
}
