# Threat model

Assets: the accepted hash, the frozen packet, and the classification.

Adversaries: either party, a model, someone editing browser storage, a future web page used as evidence.

Out of scope for v1: stealing a wallet seed (the app never asks for one), and convincing every validator with the same jailbreak. Consensus disagreement is not a defense against identical manipulation, so the gate must reject a forbidden verdict even if the model text asks for it.

Local storage is inside the user's browser trust boundary. It is not evidence.
