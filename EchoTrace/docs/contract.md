# Contract

`contracts/patchscope.py` is a single file for Studio. It keeps the Depends line, rejects non-zero value when the message exposes it, and has no admin or upgrade method.

Agreements store a canonical card hash. Acceptance must match the current version and hash. Revision clears acceptances. Cases hold one request. Evidence is typed. Early freeze hashes the packet plus the accepted agreement hash, and the frozen packet stores its own copy of the card, request, citations, and evidence. Later decisions and reviews read that copy. A protected baseline or post-patch report without a reference version stays `CAUSATION_NOT_ESTABLISHED`. `request_decision` stores the deterministic gate unless that gate is `MATCHES_INCLUDED_AND_ACCEPTANCE`, in which case the model must agree on classification, reason, clause set, evidence set, review status, and missing-evidence set. A disagreeing or invalid model output reverts and stores no verdict. The validator accepts a leader result only when it equals that deterministic gate. It does not sample the model a second time. A new-evidence review with an empty packet cannot be closed as inadmissible while its window is still open.

Web import is off.

This file has not been executed in the GenLayer VM on this host. See testing.md.
