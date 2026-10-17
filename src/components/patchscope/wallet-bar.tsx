import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton, RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { recoverMessageAddress } from "viem";
import { useAccount, useSignMessage, WagmiProvider } from "wagmi";
import { shortAddress } from "@/lib/patchscope/format";
import { usePatchScope } from "@/lib/patchscope/store";
import { studionet, wagmiConfig } from "@/lib/patchscope/wagmi";

const queryClient = new QueryClient();

const theme = lightTheme({
  accentColor: "#c4322c",
  accentColorForeground: "#f7f6f3",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={studionet} modalSize="compact" theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function HeaderWallet() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        if (!mounted) return <span className="btn btn-ghost wallet-slot">Connect</span>;
        if (!account) {
          return (
            <button type="button" className="btn btn-ink wallet-slot" onClick={openConnectModal}>
              Connect
            </button>
          );
        }
        if (chain?.unsupported) {
          return (
            <button type="button" className="btn btn-ghost wallet-slot" onClick={openChainModal}>
              Studionet
            </button>
          );
        }
        return (
          <button type="button" className="btn btn-ghost wallet-slot" onClick={openAccountModal}>
            {account.displayName || shortAddress(account.address)}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function WorkspaceWallet() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const role = usePatchScope((state) => state.activeRole);
  const adoptWallet = usePatchScope((state) => state.adoptWallet);
  const restoreDemo = usePatchScope((state) => state.restoreDemo);
  const persona = usePatchScope((state) => state.personas[role]);
  const [note, setNote] = useState("");

  return (
    <div className="wallet-cluster">
      {isConnected && address ? (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            if (!address) return;
            const message = `PatchScope\nUse ${role} for this browser workspace.\n${address.toLowerCase()}`;
            void signMessageAsync({ message })
              .then(async (signature) => {
                const recovered = await recoverMessageAddress({ message, signature });
                if (recovered.toLowerCase() !== address.toLowerCase()) {
                  setNote("The signature does not match the connected account. The role was not changed.");
                  return;
                }
                adoptWallet(role, recovered);
                setNote(`${shortAddress(recovered)} signed and is the ${role} in this browser. Not a contract transaction.`);
              })
              .catch(() => {
                setNote("The wallet did not sign. The role was not changed.");
              });
          }}
        >
          Use as {role}
        </button>
      ) : (
        <p className="hint">Header connect binds a wallet. This rehearsal is not a signature.</p>
      )}
      {persona.kind === "wallet" ? (
        <button type="button" className="btn btn-ghost" onClick={() => restoreDemo(role)}>
          Demo {role}
        </button>
      ) : null}
      {note ? (
        <p className="hint" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
