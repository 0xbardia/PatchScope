import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          service: "patchscope",
          webImport: false,
          backendSigner: false,
          emailDelivery: false,
          contractConfigured: Boolean(process.env.VITE_GENLAYER_CONTRACT_ADDRESS),
          rpcConfigured: Boolean(process.env.VITE_GENLAYER_RPC_URL || process.env.GENLAYER_RPC_URL),
          walletConnectConfigured: Boolean(process.env.VITE_WALLETCONNECT_PROJECT_ID),
        }),
    },
  },
});
