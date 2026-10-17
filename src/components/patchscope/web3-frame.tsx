import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const Web3Ready = createContext(false);

// eslint-disable-next-line react-refresh/only-export-components
export function useWeb3Ready() {
  return useContext(Web3Ready);
}

type Providers = (props: { children: ReactNode }) => ReactNode;

/** Loads RainbowKit only in the browser so the document can still render without it. */
export function Web3Frame({ children }: { children: ReactNode }) {
  const [ProvidersMod, setProvidersMod] = useState<Providers | null>(null);

  useEffect(() => {
    let alive = true;
    void import("./wallet-bar").then((mod) => {
      if (alive) setProvidersMod(() => mod.Web3Providers);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!ProvidersMod) {
    return <Web3Ready.Provider value={false}>{children}</Web3Ready.Provider>;
  }

  return (
    <Web3Ready.Provider value={true}>
      <ProvidersMod>{children}</ProvidersMod>
    </Web3Ready.Provider>
  );
}
