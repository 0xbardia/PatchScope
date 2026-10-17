# Architecture

```text
Browser UI
  local workspace (drafts, team, local decision)
  injected wallet (optional, no project id required)
        |
        | reads, only when configured
        v
GenLayer RPC / PatchScope contract
  deterministic gate
  model only if the gate would allow IN_SCOPE
```

The browser workspace is not chain truth. Team membership never becomes a signature. The server health route reports whether RPC, contract, and WalletConnect are configured. It does not sign.

Trust boundary: party text, evidence, and model output are data. Policy, ids, deadlines, and allowed classifications are not chosen by that data.
