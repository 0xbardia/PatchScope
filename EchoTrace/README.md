# PatchScope

PatchScope lets exactly two parties freeze the scope of a software fix, then classify one later request as **IN_SCOPE**, **CHANGE_REQUEST**, or **INSUFFICIENT_EVIDENCE**.

It does not decide payment, legal liability, code quality, or whether someone is telling the truth.

## What is where

The interactive application is the TanStack Start app in the parent folder (`../src`). This folder is the release dossier: contract, policy tests, specification, and security notes.

## Local product

- Landing, docs, roadmap, privacy, and security pages
- Scope-card wizard, two-party acceptance, case workspace, evidence, freeze, decision, review, and change order
- Decisions in the browser are a **local deterministic preview**, labeled as such
- Injected-wallet controls. WalletConnect stays off until a real project id is supplied
- No backend signer

## Contract

- Source: [contracts/patchscope.py](contracts/patchscope.py)
- Pure rules also live in [contracts/policy_core.py](contracts/policy_core.py) and are unit-tested
- Direct Mode was **not** executed here. The installed `genlayer-test` 0.1.2 has no `direct_deploy` fixture, and current GenLayer docs require Python 3.12+. This machine has 3.10.
- Studio deployment has **not** been signed. See [docs/DEPLOY_APPROVAL.md](docs/DEPLOY_APPROVAL.md).

## Status

PARTIAL. See [FINAL_REPORT.md](FINAL_REPORT.md).
