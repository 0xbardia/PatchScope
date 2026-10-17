# 00 Map

Inspected 2026-10-16. No contract address is deployed.

| Item | Evidence |
| --- | --- |
| Studio source | `EchoTrace/contracts/patchscope.py` (`EchoTrace/docs/contract.md`) |
| Depends | `patchscope.py:1` `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Address | EMPTY. `EchoTrace/.env.example:11`. `src/routes/workspace/diagnostics.tsx:31` |
| Chain | `src/lib/patchscope/network.ts:2-3` RPC `https://studio.genlayer.com/api`, chain id `61999` |
| Wallet | `src/lib/patchscope/wagmi.ts:25-39` injected wallet only, `ssr: true` |
| Chain writes from UI | none. Store is `src/lib/patchscope/store.ts` (browser). |

## Flows and the control that changes state

Every control below writes the browser workspace. None calls a contract method.

| Flow | UI | Local function | Contract method with no UI caller |
| --- | --- | --- | --- |
| Create card | `workspace/new.tsx` “Propose this version” | `store.propose` | `create_agreement` |
| Accept | `agreement.$agreementId.tsx` “Accept version” | `store.accept` | `accept_agreement` |
| Revise | “Save revision” | `store.revise` | `revise_agreement` |
| Reject | “Reject proposal” | `store.reject` | `reject_agreement` |
| Expire | “Expire if the deadline passed” | `store.expire` | `expire_agreement` |
| Open case | `case/new.tsx` “Open the case” | `store.createCase` | `open_case` |
| Statement | “Add statement” | `store.statement` | `submit_statement` |
| Evidence | “Add to the packet” | `store.evidence` | `submit_evidence` |
| Ack | “Acknowledge this hash” | `store.acknowledge` | `acknowledge_evidence` |
| Approve freeze | “Approve this packet” | `store.approveFreeze` | `approve_freeze` |
| Freeze | “Freeze if both approved” / “Freeze if the deadline passed” | `store.freeze` | `freeze_case` |
| Decide | “Request the local decision” | `store.decide` | `request_decision` |
| Review | “Open the review” / “Attach post-patch report” / “Finish the review” | `store.beginReview` / `reviewEvidence` / `finishReview` | `open_review` / `submit_review_evidence` / `finalize_review` |
| Change order | “Propose the change order” | `store.changeOrder` | `create_agreement` again |
| Connect | `wallet-bar.tsx` Connect / Use as | `signMessage` only | no contract method |

## Views

`get_policy`, `get_agreement`, `list_agreements`, `get_case`, `list_cases`, `get_packet`, `get_decision`. Schema on Studionet marks each `readonly`. The diagnostics page lists them and does not call them (`diagnostics.tsx` “Blocked: no contract address.”).

## Not the Studio file

`EchoTrace/contracts/contract_body.py` is an incomplete class. Nothing imports it. `policy_core.py` is the unit-test copy of `decide`.
