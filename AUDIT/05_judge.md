# 05 Judge

One round. The judge had the repo and the docs, not this write-up. High/Medium items are closed or rejected with evidence. Not re-run, because the remaining High is a missing wallet and a missing deployment, which a second round cannot invent.

| # | Severity | Disposition | Why |
| --- | --- | --- | --- |
| 1 | High | Open blocker | No UI sends a contract write. Address is empty. Needs a test wallet the operator approves. Not fixed by more local code. |
| 2 | High | Rejected | Structured agreement with the gate is required. A paraphrased summary is not stored; `_bounded_model` returns the gate when the sets match (`patchscope.py` `accept_leader_payload`). A different class reverts. That is the documented rule in `EchoTrace/docs/contract.md`. |
| 3 | High | Rejected as accepted risk | A jailbreak cannot change the stored class. It can only make an in-scope model call revert. Storing the gate anyway would ignore “invalid output stores no verdict.” |
| 4 | High | Rejected | The product classifies cited clause ids and typed evidence, not prose. The UI says so. An LLM reading clause text as law is out of v1. |
| 5 | High | Fixed | Four citations plus an overlooked fifth left the case `IN_REVIEW`. `extend_citations` refuses the fifth at open, and finalize records `REVIEW_NOT_ADMISSIBLE` instead of reverting. Tests: `test_policy_core.py`, `policy.test.ts` “refuses an overlooked review”. |
| 6 | High | Rejected | Finish-after-one-report is the stated rule: the window blocks only an empty new-evidence review. `patchscope.py` `REVIEW_WINDOW_OPEN`. |
| 7 | Medium | Rejected | Acknowledgement is “this party saw this hash,” not a vote. The evidence form says it is not verification. |
| 8 | Medium | Fixed | `contract_body.py` now raises on import and is not a deployable contract. Studio file remains `patchscope.py`. |
| 9 | Medium | Fixed | Contract `validate_scope` rejects unknown fields, caps each clause list at 24, treats `1]` like the preview, and rejects scope JSON over 24,000 characters. |
| 10 | Medium | Rejected | Returned page is at most 50. A full index walk is the cursor implementation. It does not change results. |
| 11 | Medium | Open blocker | This host cannot run GenLayer Direct Mode (`genlayer-test` 0.1.2, Python 3.10). Tests stub `genlayer`. |
| 12 | Low | Open | Value is rejected when `message_raw["value"]` is present. Methods are not payable. No withdraw path. |

Open High/Medium after this round: 1 and 11. Both need a decision outside this sandbox.
