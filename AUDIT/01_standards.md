# 01 Standards

Checked against `EchoTrace/contracts/patchscope.py`, `src/`, and [Calling LLMs](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms) plus [Non-determinism](https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism).

| Item | Status | Evidence | Fix |
| --- | --- | --- | --- |
| Depends header | PASS | `patchscope.py:1` | none |
| Class extends `gl.Contract`; constructor sets storage | PASS | `patchscope.py:250-266` | none |
| Typed storage `TreeMap` / `DynArray` | PASS | `patchscope.py:253-256` | none |
| View vs write decorators; views do not assign storage | PASS | views at lines 315, 423, 427, 431, 435, 475, 482 return JSON only | none |
| Nondet only inside `run_nondet_unsafe` | PASS | `gl.nondet.exec_prompt` is inside `leader` at `patchscope.py:826`, called from `run_nondet_unsafe` | none |
| Equivalence honest validators can agree | PASS after this pass | Validator uses `accept_leader_payload` and does not call the model again. Docs forbid exact-match of two LLM samples. | was FAIL; see `AUDIT/03_fixes.md` |
| LLM schema + malformed output | PASS | `_bounded_model` raises `MODEL_OUTPUT_INVALID`; disagreement does not replace the gate | none |
| Write input checks and `UserError` | PASS | address, window, citations, party, status checks on each write | none |
| Pagination cap | PASS | `_page` rejects limit outside 1–50 | none |
| State machine | PASS | accept only `PROPOSED`; freeze only `OPEN`; one decision; one review; window lock on empty new-evidence review | none |
| Prompt injection | PASS | packet is labeled `UNTRUSTED`; model cannot change the stored class | none |
| genlayer-js client | FAIL | no `genlayer-js` import in `src/`. Wallet is wagmi/viem `wagmi.ts` | needs a dependency approval and a deployed address |
| Wallet connect / wrong network | PASS for injected only | `wagmi.ts:25-39`, chain 61999 | WalletConnect stays off on purpose |
| Write lifecycle with tx hash | FAIL | no write method is called from the UI (`AUDIT/00_map.md`) | blocked: no contract, no signer |
| Reads show chain state | FAIL | diagnostics lists views and does not encode them | blocked until an address exists |
| Honest empty / local labels | PASS | `agreement.$agreementId.tsx` “No chain transaction was sent.”; decision copy says local preview | none |
| Address from env, single source | PASS | `diagnostics.tsx:31`, empty | none |
| Backend secrets in responses | PASS | `src/routes/api/health.ts` returns booleans only | none |
| Backend rate limit | N.A. | only `/api/health`; `API_RATE_LIMIT_PER_MINUTE` is unused | none |
| Stale `contract_body.py` | FAIL | incomplete duplicate, zero imports | do not deploy that file; Studio file is `patchscope.py` |
