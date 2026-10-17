# PatchScope

PatchScope freezes the scope of a software fix between two parties (developer and client). When subsequent requests or defect claims arrive, PatchScope classifies each request into one of three marks:
- **`IN_SCOPE`**: The request matches included work and satisfies acceptance criteria with admissible evidence.
- **`CHANGE_REQUEST`**: The request cites excluded clauses or asks for work outside the accepted scope card.
- **`INSUFFICIENT_EVIDENCE`**: The request lacks required evidence (e.g. baseline vs. post-patch reports for protected behaviors), cites mixed clauses, or fails atomicity.

PatchScope is **non-custodial** and does **not** process payments, decide legal liability, enforce code quality, or judge subjective truthfulness.

---

## Current Architecture & Implementation Scope

PatchScope currently implements two complementary layers:

1. **Local Browser Workspace (Drafting, Simulation, & Review)**
   - All user workflows (proposing scope cards, two-party acceptances, case filing, statements, evidence submission, freeze approvals, and review simulations) execute in the local browser workspace using PGLite and client state.
   - Local actions are explicitly labeled as **Browser Previews** and carry no blockchain finality.
   - Account roles (Developer / Client) can be simulated locally or bound to an injected Web3 wallet via EIP-191 personal message signing.
   - **Important**: Frontend user workflow buttons operate locally; they do not currently submit write transactions directly to the blockchain.

2. **Intelligent Contract & Public Reads on GenLayer Studionet**
   - The canonical intelligent contract (`EchoTrace/contracts/patchscope.py`) is deployed on GenLayer Studionet.
   - The contract implements deterministic gates before multi-validator LLM consensus under Optimistic Democracy.
   - The web app provides a public read-only Diagnostics Suite (`/workspace/diagnostics`) querying the live contract and node RPC.
   - The contract operates with zero admin backdoors (`admin: false`), accepts no native token deposits (`value == 0`), and has external web scraping disabled (`webImport: false`).

---

## Canonical Contract & Studionet Deployment

| Property | Value |
| :--- | :--- |
| **Network** | GenLayer Studionet Testnet |
| **Chain ID** | `61999` (`0xf22f`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Active Contract Address** | `0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df` |
| **Deployment Transaction** | `0x4708be83a0fd7d6b015b81b2656dc14673b5e87fe6d0c36af9717d47946e2f4f` |
| **Deployment Status** | `ACCEPTED`, `MAJORITY_AGREE` (Consensus Result: 6, 3 AGREE, 2 IDLE) |
| **Canonical Contract Source** | `EchoTrace/contracts/patchscope.py` |
| **Source SHA-256** | `30f59a5ea57a557ccd0dcc5e2e4dde2c3929d4646e9af6ca80cfce4b8505bcaf` |
| **Source Size** | 42,706 bytes |
| **Runtime Depends Pin** | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |

> **Note on Deployment History**: An earlier deployment transaction (`0x053ba6045893e50c22da36652b9767538ce0aa78d17f3f13c2c0b6504dfde991`) failed during constructor execution due to manual instantiation of `DynArray` and `TreeMap` collections. GenVM zero-initializes collection fields automatically. The active deployment (`0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df`) resolved this and is verified active.

### Verified Public View Methods

The deployed contract exposes seven public view methods, all independently verified against Studionet RPC:

1. `get_policy() -> str`: Returns policy configuration JSON (`version: patchscope-v1.0.0`, `hash`, `payments: false`, `admin: false`, `webImport: false`).
2. `list_agreements(cursor: str, limit: u32) -> str`: Returns paginated agreement list. Reverts on limit 0 (`BAD_LIMIT`).
3. `list_cases(cursor: str, limit: u32) -> str`: Returns paginated case list. Reverts on invalid cursor (`BAD_CURSOR`).
4. `get_agreement(agreement_id: str) -> str`: Loads stored agreement record by ID (reverts with `NOT_FOUND` on unpopulated IDs).
5. `get_case(case_id: str) -> str`: Loads stored case record by ID (reverts with `NOT_FOUND` on unpopulated IDs).
6. `get_decision(case_id: str) -> str`: Retrieves consensus decision for a case (reverts with `NOT_FOUND` on unpopulated IDs).
7. `get_packet(case_id: str) -> str`: Retrieves the frozen evidence packet (reverts with `NOT_FOUND` on unpopulated IDs).

---

## Wallet Requirements

- **Injected Wallets Supported**: MetaMask, Rabby, Brave, and other EIP-6963 compliant browser extensions.
- **WalletConnect**: Disabled by default. Enabled only when a valid `VITE_WALLETCONNECT_PROJECT_ID` (≥32 chars) is provided.
- **Current Integration**: Connected wallets sign off-chain EIP-191 messages for persona adoption in the browser. Automated scripts cannot and do not broadcast transactions to Studionet.

---

## Getting Started

### Prerequisites
- Node.js 20+ (Node.js 22+ recommended)
- npm 10+
- Python 3.10+ (for running contract unit tests)

### Installation
```bash
git clone https://github.com/0xbardia/PatchScope.git
cd PatchScope
npm install
cp .env.example .env
```

### Development Server
```bash
npm run dev
# Starts local development server at http://127.0.0.1:8080
```

### Production Build
```bash
npm run build
npm run preview
```

---

## Quality Gate & Test Suites

The repository enforces deterministic quality gates across frontend and smart contracts:

```bash
# 1. Run all frontend and policy unit test suites (72 passing tests)
npm run test

# 2. Run TypeScript strict type-check
npm run typecheck

# 3. Run ESLint code quality rules
npm run lint

# 4. Run smart contract unit and consensus-bound tests (7 passing tests)
python3 -m unittest discover -s EchoTrace/contracts -p "test_*.py"

# 5. Run live read-only diagnostics against Studionet
npm run check:views

# 6. Execute full 34-scenario Playwright E2E and viewport test suite
node scripts/patchscope-qa-suite.mjs

# 7. Execute production build and asset bundling
npm run build
```

---

## Known Limitations & Remaining Roadmap

1. **Frontend Write Integration**: User workflows currently operate locally within the browser workspace. Wiring the UI buttons to broadcast on-chain `create_agreement`, `accept_agreement`, `open_case`, and `freeze_case` transactions via injected wallets is an active roadmap item.
2. **Non-Custodial**: PatchScope provides scope verdict classifications only. Escrow, financial compensation, or payment releases must be handled externally.
3. **Public Chain Visibility**: Records written to GenLayer Studionet are public. Do not store secrets, tokens, or PII in scope descriptions or test excerpts.
4. **No Direct Model Mode**: v1 uses deterministic gating before LLM consensus. Web-import crawling is disabled to guarantee repeatable verification.

---

## License

This repository includes the [MIT License](LICENSE) (inherited from the EchoTrace dossier). Final open-source license approval is pending confirmation by the project owner prior to public repository release.
