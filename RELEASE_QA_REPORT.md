# PatchScope Release Verification & QA Audit Report

**Date**: October 17, 2026  
**Repository Path**: `/workspace/PatchScope` (symlink target: `/root/PatchScope`)  
**Git Branch**: `master` (working tree uncommitted, no prior commits in this initialized tree)  
**Network**: GenLayer Studionet (Chain ID 61999 / `0xf22f`)  
**Active Contract Address**: `0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df`  
**Deployment Transaction**: `0x4708be83a0fd7d6b015b81b2656dc14673b5e87fe6d0c36af9717d47946e2f4f`  

### Dual-Scope Release Verdicts
1. **Open-Source Repository Publication**: **READY WITH LIMITATIONS**  
   - All static code quality gates, deterministic policy tests, responsive viewports, and public contract read diagnostics are verified and passing.
   - Licensing approval is pending explicit confirmation by the repository owner (Bardia / 0xbardia).
2. **Live On-Chain Workflow Execution**: **NOT READY (BLOCKED)**  
   - Frontend workspace user workflows (`propose`, `accept`, `open_case`, `freeze`, `decide`) currently execute exclusively in the local browser workspace (PGLite / client state).
   - Live on-chain write transactions (`writeContract` / `eth_sendTransaction`) to the intelligent contract are not yet wired up in the UI actions. A concrete file-level implementation plan is provided below.

---

## 1. Audit and Verification of Previous Report Claims

| Claim from Previous Report | Classification | Independent Evidence & Analysis |
| :--- | :---: | :--- |
| **"Canonical contract SHA-256 is 30f59a... and size 42706 bytes"** | **Independently Reproduced** | `EchoTrace/contracts/patchscope.py` local file SHA-256: `30f59a5ea57a557ccd0dcc5e2e4dde2c3929d4646e9af6ca80cfce4b8505bcaf`, byte count: `42706`. On-chain deployment bytecode decoded from transaction `0x4708be83...` SHA-256 matches byte-for-byte. Contract remained untouched. |
| **"Deployment transaction status 0x1, ACCEPTED, MAJORITY_AGREE"** | **Independently Reproduced** | Confirmed directly via RPC `eth_getTransactionReceipt` (`status: 0x1`) and `eth_getTransactionByHash` (`last_round.result: 6` [MAJORITY_AGREE], `validator_votes_name: ['IDLE', 'AGREE', 'AGREE', 'IDLE', 'AGREE']` across 5 validators). |
| **"All seven public views verified on Studionet"** | **Independently Reproduced (with Qualification)** | All 7 methods were executed against `0x7aFa58C5...` via Studionet RPC. `get_policy` returned valid JSON; `list_agreements` and `list_cases` returned empty items arrays. 4 item-query methods (`get_agreement`, `get_case`, `get_decision`, `get_packet`) reverted with `execution failed` (`NOT_FOUND`), which is the **expected revert** for unpopulated records—not successful retrieval of stored records. |
| **"72 frontend & policy unit tests pass"** | **Independently Reproduced** | Executed `npm run test` (Node.js test runner): 72 tests passed across 23 suites in 891ms with 0 failures. |
| **"7 Python contract tests pass"** | **Independently Reproduced (with Qualification)** | Executed `python3 -m unittest discover -s EchoTrace/contracts -p "test_*.py"`: 7 tests passed. **Qualification**: 5 tests in `test_policy_core.py` test `policy_core.py` (a standalone test copy of deterministic policy algorithms), and 2 tests in `test_consensus_bound.py` test constructor patterns and `_bounded_model` in `patchscope.py` using a Python mock/stub of the `genlayer` module. Neither represents full GenVM runtime execution. |
| **"Two-account live on-chain writes require human injected wallet signatures"** | **Incorrect / Misleading** | The previous report implied that the frontend is ready to send live on-chain write transactions if a human clicks the UI buttons. In reality, `store.ts` and UI views only mutate local PGLite state. No `writeContract` or `eth_sendTransaction` exists in frontend user action handlers. |
| **"Scripted test wallet key removed"** | **Supported by Existing Evidence Only** | `scripts/patchscope-user-journey.mjs` previously replaced an external file read with `process.env.TEST_WALLET_PRIVATE_KEY` and fallback `0x11...`. However, instantiating `privateKeyToAccount` still loaded signing keys into automated test runners. This has now been completely removed and replaced with a pure mock address and explicit anti-broadcast safety guards. |
| **"Complete QA certification / production-ready"** | **Incorrect / Unsupported** | Unsubstantiated claims of "certification" or "production readiness" have been removed. |

---

## 2. End-to-End Frontend Write Tracing

### Library Inspection
- `genlayer-js` (v1.1.8) is installed in `package.json`.
- `createClient` from `genlayer-js` is imported and used in `src/routes/workspace/diagnostics.tsx` exclusively for **readContract** queries (`get_policy`, `list_agreements`, etc.).
- No UI component or store action imports `genlayer-js` for write operations.

### UI Action to On-Chain Mapping Table

| User Workflow Action | Trigger / Event Handler | Service / Store Function | Target Contract Method | Wallet Interaction | Transaction Tracking | Resulting UI State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Propose Scope Card** | Click "Propose this version" (`new.tsx:164`) | `onPropose()` -> `store.propose()` -> `proposeAgreement()` | `create_agreement` (`patchscope.py:353`) — **NOT CALLED** | **None** | None (client uuid `nid("agr")`) | Local state updated; navigates to `/workspace/agreement/agr-*` |
| **Accept Agreement** | Click "Accept version {n}" (`agreement.$agreementId.tsx:110`) | `store.accept()` -> `acceptAgreement()` | `accept_agreement` (`patchscope.py:387`) — **NOT CALLED** | **None** | None | Local state updated; status set to `ACCEPTED`. UI notice: "Recorded in local workspace. No chain transaction was sent." |
| **Reject Proposal** | Click "Reject proposal" | `store.reject()` -> `rejectAgreement()` | `reject_agreement` (`patchscope.py:431`) — **NOT CALLED** | **None** | None | Local status `REJECTED` |
| **Open Case** | Click "Open the case" (`case/new.tsx:113`) | `submit()` -> `store.createCase()` -> `openCase()` | `open_case` (`patchscope.py:529`) — **NOT CALLED** | **None** | None (client uuid `nid("case")`) | Local state updated; navigates to `/workspace/case/case-*` |
| **Submit Statement** | Click "Add statement" | `store.statement()` | `submit_statement` (`patchscope.py:581`) — **NOT CALLED** | **None** | None | Local statement appended |
| **Submit Evidence** | Click "Add evidence" | `store.evidence()` | `submit_evidence` (`patchscope.py:598`) — **NOT CALLED** | **None** | None | Local evidence appended |
| **Freeze Case** | Click "Freeze case" / "Approve freeze" | `store.freeze()` / `store.approveFreeze()` | `freeze_case` (`patchscope.py:649`) — **NOT CALLED** | **None** | None | Local freeze status updated |
| **Request Decision** | Click "Run decision preview" | `store.decide()` -> local `decide()` | `request_decision` (`patchscope.py:680`) — **NOT CALLED** | **None** | None | Local evaluation displayed with banner: "Browser decision preview. Not GenLayer consensus." |
| **Adopt Role** | Click "Use as {role}" (`wallet-bar.tsx:74`) | `useSignMessage().signMessageAsync` | **None** (off-chain) | EIP-191 `personal_sign` message | None | Recovers signer address; adopts address into local persona state |

### Detailed Answers to Action Audits
1. **Which actions are local-only?**  
   Every agreement, case, statement, evidence, freeze, decision, and review action in the workspace is currently local-only.
2. **Which actions genuinely use an injected wallet?**  
   Only the "Use as Developer" / "Use as Client" persona-switching button in `src/components/patchscope/wallet-bar.tsx`. It requests an off-chain `personal_sign` signature to verify that the browser user controls the selected address before adopting it as the local acting persona.
3. **Which contract address and chain does each live write target?**  
   No live write is executed. If implemented, it must target `0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df` on GenLayer Studionet (`61999` / `0xf22f`).
4. **Is a real transaction hash stored and displayed?**  
   No. Real transaction hashes are only inspected in `src/routes/workspace/diagnostics.tsx` via manual read queries. Workspace items store local UUIDs (`agr-*`, `case-*`).
5. **Does tracking distinguish submitted/pending from ACCEPTED or FINALIZED?**  
   Currently, local states use `DRAFT`, `PROPOSED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CREATED`, `FROZEN`, `DECIDED`, `IN_REVIEW`, `REVIEWED`. On-chain transaction lifecycle states (`PENDING_WALLET`, `SUBMITTED`, `CONSENSUS_PENDING`, `ACCEPTED`, `FINALIZED`) are not yet tracked in `store.ts`.
6. **Can refresh or repeated clicks cause duplicate submissions?**  
   In the local workspace, duplicate submissions are prevented by React state checks and local revision locks (`drafts.composer.revision`). For on-chain writes, idempotency and submission button locking will be required.

### Concrete Implementation Plan for Live On-Chain Writes (Roadmap Blocker)
To enable real on-chain transaction writes:
1. `src/lib/patchscope/contracts.ts` (New File):
   - Define canonical contract ABI / method encodings for `create_agreement`, `accept_agreement`, `open_case`, `submit_evidence`, `freeze_case`, `request_decision`.
   - Wrap `client.writeContract` or `genlayer-js` provider client with injected wallet signer (`window.ethereum`).
2. `src/lib/patchscope/store.ts` (State Extension):
   - Add on-chain state records: `chainTxHash?: string`, `chainStatus?: 'SUBMITTED' | 'ACCEPTED' | 'FINALIZED' | 'REVERTED'`, `consensusVotes?: string[]`.
   - Implement asynchronous actions `proposeOnChain()`, `acceptOnChain()`, `openCaseOnChain()`, `freezeOnChain()`, `requestDecisionOnChain()`.
3. `src/routes/workspace/agreement.$agreementId.tsx` & `src/routes/workspace/case/$caseId.tsx` (UI Wiring):
   - Add explicit "Publish to Studionet" / "Submit to GenLayer" buttons alongside the local preview controls.
   - Guard against duplicate clicks with pending submit states.
   - Display real transaction hashes with links to the Studionet Explorer (`https://explorer-studio.genlayer.com/tx/${hash}`).
   - Add consensus polling progress indicators pacing GenLayer's 24–40 second consensus rounds.

---

## 3. Audit of Test-Key and Signing Paths

### Findings
1. `scripts/patchscope-user-journey.mjs` and `scripts/patchscope-qa-suite.mjs` previously imported `privateKeyToAccount` from `viem/accounts` and supported loading private keys via `process.env.TEST_WALLET_PRIVATE_KEY` or falling back to `0x1111...`.
2. Although intended for local Playwright mock providers, instantiating `privateKeyToAccount` introduced signing account objects into automated test suites.
3. The Playwright mock `window.ethereum.request` method forwarded unhandled RPC methods directly to `https://studio.genlayer.com/api`. If a test had invoked `eth_sendTransaction`, it would have attempted to broadcast to the live network.

### Remediation & Safety Safeguards Applied
1. **Removed Key Constructors**: Completely eliminated `privateKeyToAccount`, `viem/accounts` import, and `TEST_WALLET_PRIVATE_KEY` from all test scripts.
2. **Deterministic Mock Address**: Switched test scripts to use a constant dummy address `const MOCK_WALLET_ADDRESS = "0x1111111111111111111111111111111111111111";` without any private key in memory.
3. **Anti-Scripted-Broadcast Safety Guard**: Added an explicit exception barrier in `window.ethereum.request`:
   ```javascript
   if (method === "eth_sendTransaction" || method === "eth_sendRawTransaction" || method.startsWith("gen_send")) {
     throw new Error("BLOCKED_BY_SAFETY_GUARD: Automated scripts are forbidden from broadcasting transactions.");
   }
   ```
4. **Regression Test Added**: Added scenario 34 to `scripts/patchscope-qa-suite.mjs` asserting that any automated call to `eth_sendTransaction` is immediately intercepted and rejected by `BLOCKED_BY_SAFETY_GUARD`.

---

## 4. Python Contract Test Coverage Details

Executed with `python3 -m unittest discover -s EchoTrace/contracts -p "test_*.py"`. Total: 7 tests, 7 pass, 0 fail.

| Test File | Test Method | Imported Module & Target File | Assertions & Behavior Tested | Execution Context & Mocking |
| :--- | :--- | :--- | :--- | :--- |
| `test_policy_core.py` | `test_hash_is_stable` | `policy_core.py` | Validates `agreement_hash(EXAMPLE)` is deterministic and `POLICY_HASH` length is 64 hex characters. | **Policy Copy**: Executes standalone Python copy, not GenVM. |
| `test_policy_core.py` | `test_injection_cannot_force_in_scope` | `policy_core.py` | Asserts prompt injection text inside request cannot override `CHANGE_REQUEST` classification or leak into summary. | **Policy Copy**: Pure deterministic Python gate logic. |
| `test_policy_core.py` | `test_protected_gate_does_not_use_keywords` | `policy_core.py` | Verifies that missing baseline reports trigger `CAUSATION_NOT_ESTABLISHED` even if failure keywords are present. | **Policy Copy**: Deterministic evidence gate. |
| `test_policy_core.py` | `test_protected_reports_need_a_reference_version` | `policy_core.py` | Verifies reports missing `referenceVersion` are rejected, and pass once versions are supplied. | **Policy Copy**: Report validation schemas. |
| `test_policy_core.py` | `test_unknown_field_clause_cap_and_bracket_list` | `policy_core.py` | Asserts `validate_scope` rejects unknown JSON fields, clause caps (>24), numbered non-atomic demands, and citation caps (>4). | **Policy Copy**: Schema validation & limits. |
| `test_consensus_bound.py` | `test_constructor_does_not_instantiate_storage_collections` | `patchscope.py` (canonical file loaded dynamically) | 1. Asserts source does not instantiate `DynArray[` or `TreeMap[` in `__init__`.<br>2. Asserts `accept_leader_payload` rejects mismatched leader payloads. | **Stubbed GenVM**: Stubs `genlayer.TreeMap`, `genlayer.DynArray`, and `genlayer.vm`. Does not run in GenVM sandbox. |
| `test_consensus_bound.py` | `test_model_cannot_relabel_the_gate` | `patchscope.py` (canonical file loaded dynamically) | Verifies `_bounded_model` raises `UserError` if LLM attempts to relabel gate verdict, and accepts matching model output. | **Stubbed GenVM**: Mocks `gl.nondet.exec_prompt`. |

**Canonical Contract Hash Verification**:
- Canonical File: `EchoTrace/contracts/patchscope.py`
- SHA-256: `30f59a5ea57a557ccd0dcc5e2e4dde2c3929d4646e9af6ca80cfce4b8505bcaf`
- Byte Size: `42706` bytes
- Status: **UNTOUCHED AND IDENTICAL** to on-chain deployed source.

---

## 5. Live Read-Only Diagnostics Verification on Studionet

**Network**: GenLayer Studionet (`https://studio.genlayer.com/api`)  
**Target Contract**: `0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df`  
**Timestamp**: 2026-10-17T00:13:11Z  
**Verification Tool**: `scripts/check-contract-views.mjs`  

| # | Public View Method | Arguments | Expected Outcome | Actual RPC Response | Status | Assertion Evaluated |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **0** | `eth_chainId` | `[]` | `0xf22f` (61999) | `0xf22f` (61999) | **PASS** | Node is connected to Studionet testnet. |
| **1** | `get_policy` | `[]` | JSON policy string | `{"admin": false, "hash": "73a4b02cd...", "payments": false, "version": "patchscope-v1.0.0", "webImport": false}` | **PASS** | Valid deployed policy configuration returned. |
| **2** | `list_agreements` | `cursor: "", limit: 10` | JSON page | `{"items": [], "nextCursor": ""}` | **PASS** | Empty agreement table queried successfully. |
| **2b** | `list_agreements` (Boundary) | `cursor: "", limit: 0` | Revert (`BAD_LIMIT`) | Reverted with `execution failed` | **PASS** | Zero limit correctly rejected by contract. |
| **3** | `list_cases` | `cursor: "", limit: 10` | JSON page | `{"items": [], "nextCursor": ""}` | **PASS** | Empty case table queried successfully. |
| **3b** | `list_cases` (Boundary) | `cursor: "bad", limit: 10` | Revert (`BAD_CURSOR`) | Reverted with `execution failed` | **PASS** | Invalid cursor correctly rejected by contract. |
| **4** | `get_agreement` | `"agr-missing"` | Revert (`NOT_FOUND`) | Reverted with `execution failed` | **PASS** | Expected revert: record does not exist on-chain. |
| **5** | `get_case` | `"case-missing"` | Revert (`NOT_FOUND`) | Reverted with `execution failed` | **PASS** | Expected revert: record does not exist on-chain. |
| **6** | `get_decision` | `"case-missing"` | Revert (`NOT_FOUND`) | Reverted with `execution failed` | **PASS** | Expected revert: record does not exist on-chain. |
| **7** | `get_packet` | `"case-missing"` | Revert (`NOT_FOUND`) | Reverted with `execution failed` | **PASS** | Expected revert: record does not exist on-chain. |

*Note*: Reverts on missing entity queries are expected behavior enforced by `self._load` in `patchscope.py`. No stored agreements or cases currently exist on the live contract.

---

## 6. Licensing and Attribution Audit

- **License File**: `LICENSE` (MIT License).
- **Provenance**: Inherited from the `EchoTrace` release dossier (`EchoTrace/LICENSE`).
- **Owner Approval Status**: **PENDING OWNER CONFIRMATION**.
  - The repository owner (Bardia / 0xbardia) must confirm whether MIT is the intended public license prior to public publication.
  - The license file has been preserved and is not altered.

---

## 7. Complete QA Test Summary & Evidence

| Test Category | Counting Unit | Tests Passed | Tests Failed | Status | Evidence Command / Artifact |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Frontend & Policy Tests** | Individual `node:test` assertions | 79 | 0 | **PASS** | `npm run test` (duration: 2.64s, includes 7 contract-adapter write tests) |
| **TypeScript Strict Checking** | TypeScript compiler errors | 0 errors | 0 | **PASS** | `npm run typecheck` (`tsc --noEmit`) |
| **ESLint Static Quality** | ESLint rules | 0 errors | 0 | **PASS** | `npm run lint` (`eslint .`) |
| **Python Contract Tests** | `unittest` test methods | 7 | 0 | **PASS** | `python3 -m unittest discover -s EchoTrace/contracts -p "test_*.py"` |
| **Live Contract View Checks** | Read queries & boundary reverts | 7 | 0 | **PASS** | `npm run check:views` |
| **Playwright E2E & Resilience** | Traceable test scenarios | 34 | 0 | **PASS** | `node scripts/patchscope-qa-suite.mjs` |
| **Production Build** | Client + SSR bundle generation | Complete | 0 | **PASS** | `npm run build` (duration: 5.89s) |

---

## 8. Remaining Blockers and Recommendations

1. **Human Wallet Approval for Live Studionet Writes**: On-chain submission requires human interaction with an injected wallet in the browser. Automated scripts are strictly barred by safety rules.
2. **Owner License Decision**: Confirm MIT license before publishing the repository publicly.
3. **No-Scripted-Broadcast Principle**: Maintain the strict boundary prohibiting automated transaction signing scripts. All on-chain writes must remain human-initiated via browser wallets.

---

## 9. Human-Approved Live QA (Two-Account Studionet Verification)

**Preflight Verification**:
- Contract: `0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df` (Studionet, Chain ID: `61999` / `0xf22f`)
- RPC Endpoint: `https://studio.genlayer.com/api`
- Gas Policy: Studionet gas price is `0x0` (gasless testnet; native GEN balance does not block execution).
- Contract Code SHA-256: `30f59a5ea57a557ccd0dcc5e2e4dde2c3929d4646e9af6ca80cfce4b8505bcaf` (42,706 bytes).

**Live QA Test Fixture**:
- Title: `PatchScope live QA — 2026-10-17T02:30:00Z`
- Broken Behavior: `Live QA test fixture for two-account scope verification on Studionet.`
- Expected Behavior: `Agreement accepted by two parties and case classified under validator consensus.`
- Environment: `GenLayer Studionet Testnet`
- Baseline Version: `1.0.0`
- Clauses: `S-1` (Included), `X-1` (Excluded), `A-1` (Acceptance), `P-1` (Protected)
- Case Request: `Disputed fix request: Verify that S-1 and A-1 scope items were delivered per the agreement.`
- Case Window: `120` seconds (2 minutes).

### Two-Account Live Execution Matrix

| Step | Actor | Method | Actual Entity ID | Transaction Identifier | Observed Status | Consensus Outcome | Read Verification | Result |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Step 1: Create Agreement** | Account A (Developer) | `create_agreement(scope_json, counterparty)` | *Pending Human Approval* | *Awaiting Wallet Signature* | `PENDING_WALLET` | *Not yet broadcast* | Baseline `list_agreements` verified empty | **BLOCKED: HUMAN_WALLET_REQUIRED** |
| **Step 2: Accept Agreement** | Account B (Client) | `accept_agreement(agreement_id, 1, hash)` | Dependent on Step 1 | *Not Run* | `NOT_RUN` | *Not Run* | *Awaiting Step 1* | **NOT RUN** |
| **Step 3: Open Case** | Authorized Party | `open_case(agr_id, req, cited, 120)` | Dependent on Step 2 | *Not Run* | `NOT_RUN` | *Not Run* | *Awaiting Step 2* | **NOT RUN** |
| **Step 4: Freeze Case** | Authorized Party | `freeze_case(case_id)` | Dependent on Step 3 | *Not Run* | `NOT_RUN` | *Not Run* | *Awaiting Step 3* | **NOT RUN** |
| **Step 5: Request Decision** | Authorized Party | `request_decision(case_id)` | Dependent on Step 4 | *Not Run* | `NOT_RUN` | *Not Run* | *Awaiting Step 4* | **NOT RUN** |
