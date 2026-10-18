/** Public Studionet endpoint and chain configuration. */
export const STUDIONET_RPC = "https://studio.genlayer.com/api";
export const STUDIONET_CHAIN_ID = 61999;

/** Validate a 20-byte hex Ethereum address. Syntactic check only; does not prove contract interface compatibility. Rejects zero-address. */
export function isValidContractAddress(address: unknown): address is `0x${string}` {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return false;
  if (/^0x0{40}$/i.test(trimmed)) return false;
  return true;
}

/**
 * Resolve explicitly configured PatchScope contract address from environment or parameter.
 * Returns null when unconfigured or syntactically invalid.
 */
export function getConfiguredContractAddress(overrideAddress?: string): `0x${string}` | null {
  if (overrideAddress && isValidContractAddress(overrideAddress)) {
    return overrideAddress as `0x${string}`;
  }
  const envVal =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS
      : typeof process !== "undefined" && process.env
        ? process.env.VITE_GENLAYER_CONTRACT_ADDRESS
        : undefined;

  const trimmed = typeof envVal === "string" ? envVal.trim() : "";
  if (!trimmed || !isValidContractAddress(trimmed)) {
    return null;
  }
  return trimmed as `0x${string}`;
}

/**
 * Asserts that a valid contract address is configured in the environment.
 * Throws a descriptive error when missing or malformed.
 */
export function assertConfiguredContractAddress(overrideAddress?: string): `0x${string}` {
  const configured = getConfiguredContractAddress(overrideAddress);
  if (!configured) {
    throw new Error(
      "Contract address is not configured. Set VITE_GENLAYER_CONTRACT_ADDRESS in your environment with a valid 0x contract address to interact with GenLayer Studionet.",
    );
  }
  return configured;
}
