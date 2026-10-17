# 03 Fixes

## Model validator resampled the LLM

- Bug: `validator` called `leader()` again and required `_equivalent` between two model samples (`patchscope.py` before this change).
- Root cause: [Calling LLMs](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms) says two LLM outputs are not identical, so exact comparison fails consensus even when both match the gate. After `_bounded_model` returns the gate object, a second sample that disagrees raises, and the validator returned false.
- Fix: `accept_leader_payload` compares the leader payload to the deterministic gate. The validator does not call `gl.nondet.exec_prompt`.
- Test: `EchoTrace/contracts/test_consensus_bound.py` (7 tests with `test_policy_core.py`, all OK). The stub’s `exec_prompt` raises if a test calls it. `test_model_cannot_relabel_the_gate` rejects `CHANGE_REQUEST`. `test_leader_payload_must_equal_the_gate` rejects a payload that is not the gate.
- Evidence: `python3 -m unittest test_consensus_bound.py test_policy_core.py` → `Ran 7 tests` `OK`.

## Earlier contract fixes already in this tree

- Decisions read the frozen request, citations, and evidence.
- Protected reports require `referenceVersion` (`test_policy_core.py`).
- A model that relabels `IN_SCOPE` raises `MODEL_OUTPUT_INVALID` instead of storing `CHANGE_REQUEST`.
