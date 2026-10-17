# Security Policy

## Reporting Security Issues

If you discover a security vulnerability or potential exploit in PatchScope, please report it responsibly before any public disclosure.

- **Reporting process**: Open a private GitHub security advisory or contact repository maintainers via designated repository communication channels.
- **Do not include**: Never include private keys, credentials, seed phrases, or sensitive personal data in issue reports or public pull requests.
- **Redaction**: Redact all live wallet addresses or production tokens in reproductions.

## Trust Boundaries and Security Architecture

PatchScope enforces clear security boundaries:

1. **Non-Custodial Design**: PatchScope accepts zero native value (`value == 0`). It holds no escrow funds, processes no payments, and has no administrative upgrade keys or owner backdoors (`admin == false`, `payments == false`).
2. **Local Workspace vs. On-Chain Consensus**:
   - The browser workspace stores drafts and simulated previews in local storage (`PGLite` / browser memory).
   - Local actions are explicitly marked as local previews and do NOT represent blockchain finality or validator consensus.
   - Genuine consensus marks (`IN_SCOPE`, `CHANGE_REQUEST`, `INSUFFICIENT_EVIDENCE`) originate solely from GenLayer Studionet validator execution under Optimistic Democracy.
3. **Prompt Injection Defense**:
   - The intelligent contract does not pass raw user text directly to an LLM without strict deterministic gate checks.
   - The leader validator's output is bounded by `_bounded_model`, ensuring relabeled gates or out-of-scope clauses are rejected by consensus.
4. **Public Data Exposure**:
   - All agreements, statements, and case packets submitted to the Studionet contract are readable on the public blockchain by anyone who queries the contract address.
   - Users must never include secrets, API tokens, proprietary code, or personally identifiable information (PII) in scope clauses or evidence excerpts.
