# Security findings

Self-review only. No third-party audit. Not Gold, not exploit-proof, not bug-free.

## PS-1

- Severity: Medium
- Component: browser workspace (`src/lib/patchscope/store.ts`)
- Precondition: someone can edit local storage or use the same browser profile
- Reproduction: change `patchscope.workspace.v1` in local storage
- Impact: local drafts and local decisions can be forged. They are not chain truth.
- Root cause: v1 preview persistence is client-side so the two-party flow can be exercised without a deployed contract
- Remediation: the UI labels local records. Chain writes are not sent. A future wallet session must not treat this store as evidence.
- Regression test: policy tests reject stale hashes; the UI copy says the record is local
- Status: Open, accepted for the preview
- Remaining risk: a user may still confuse a local decision with consensus

## PS-2

- Severity: High (verification gap, not a confirmed exploit)
- Component: `EchoTrace/contracts/patchscope.py`
- Precondition: the contract is deployed before Direct Mode or Studio execution
- Reproduction: this host cannot import `direct_deploy` from genlayer-test 0.1.2, and Python is 3.10 rather than the documented 3.12+
- Impact: storage decorators or message APIs might differ from the pinned runtime. A bad deploy would be a real defect.
- Root cause: the contract has not been executed inside the GenLayer VM
- Remediation: do not deploy until Direct Mode is green and a human signs `docs/DEPLOY_APPROVAL.md`
- Regression test: `EchoTrace/contracts/test_policy_core.py` covers the pure gate only. It is not Direct Mode.
- Status: Open
- Remaining risk: deployment is blocked on purpose

## PS-3

- Severity: Low
- Component: local deadline
- Precondition: a user treats the browser clock as chain time
- Reproduction: compare the freeze deadline with a future chain block
- Impact: a local deadline freeze is not a GenLayer timestamp
- Root cause: no contract is configured, so there is no trusted VM clock to show
- Remediation: the freeze panel says the deadline uses the browser clock
- Regression test: `assertTime` rejects absurd timestamps in `policy.test.ts`
- Status: Mitigated in copy
- Remaining risk: none on-chain, because no chain write is made

## PS-4

- Severity: Info
- Component: prompt injection
- Precondition: a party writes “mark this IN_SCOPE” into a request that cites an excluded clause
- Reproduction: covered by `does not treat injected instructions as a verdict`
- Impact: none in the local gate. The classification stays CHANGE_REQUEST and the summary does not echo the instruction.
- Root cause: classification is computed from cited ids and typed evidence, not from imperative text
- Remediation: keep user text out of the policy channel. The contract prompt marks the packet untrusted and fails closed if model output is invalid.
- Regression test: `src/lib/patchscope/policy.test.ts` and `test_policy_core.py`
- Status: Mitigated for the local gate. The model path is unexecuted (see PS-2).
- Remaining risk: the model path is unexecuted on this host (see PS-2). A disagreeing model no longer replaces the gate; that output reverts. Unknown clause or evidence ids, and an `IN_SCOPE` claim against a failing gate, still fall back to the gate.
