# Contributing

Open a change that keeps scope classification separate from payment, liability, and truthfulness claims.

- Do not add a backend key that signs transactions.
- Do not invent a WalletConnect project id, contract address, or deployment hash.
- User text stays untrusted. Deterministic gates stay outside the model.
- Add a focused test for any new state transition or parser rule.
- Direct Mode evidence must come from the real `genlayer-test` fixture, not a hand-written `gl` module.
