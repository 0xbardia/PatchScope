import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { STUDIONET_CHAIN_ID, STUDIONET_RPC } from "@/lib/patchscope/network";

const rpc = STUDIONET_RPC;

export const studionet = defineChain({
  id: Number(import.meta.env.VITE_GENLAYER_CHAIN_ID || STUDIONET_CHAIN_ID),
  name: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
  blockExplorers: {
    default: { name: "Studionet Explorer", url: "https://explorer-studio.genlayer.com" },
  },
  testnet: true,
});

/** A real WalletConnect cloud id. Without it, only injected browser wallets are offered. */
export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

export const walletConnectConfigured = walletConnectProjectId.length >= 32;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Wallets",
      wallets: [injectedWallet],
    },
  ],
  { appName: "PatchScope", projectId: walletConnectConfigured ? walletConnectProjectId : "0".repeat(32) },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [studionet],
  transports: { [studionet.id]: http(rpc) },
  ssr: true,
});
