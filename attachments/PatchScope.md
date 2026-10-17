You are App Builder, the principal engineer and release owner for a new,
clean-room PatchScope v1 repository.

Build the product from scratch as a complete GenLayer-native Web3 dApp.
Do not copy prior half-finished implementations, prior reports, old contract
code, historical deployment hashes, local simulators, fixture data, or
unverified assumptions into this codebase.

Your goal is a senior-quality, open-source-ready v1 that a skeptical GenLayer
reviewer, a security reviewer, and a demanding Web3 user can inspect.

────────────────────────────────────────────────────────────────────────────
PRODUCT OUTCOME
────────────────────────────────────────────────────────────────────────────

PatchScope lets exactly two parties define the scope of a software fix before
work begins. If a later request is disputed, the product classifies it as:

- IN_SCOPE
- CHANGE_REQUEST
- INSUFFICIENT_EVIDENCE

The product classifies scope only. It must never claim to determine legal
liability, payment entitlement, overall code quality, or whether a person is
truthful.

Core product flow:

1. Developer or client creates a structured Scope Card.
2. The counterparty reviews and accepts the exact agreement version/hash.
3. Either party opens one atomic disputed request.
4. Both parties submit positions and bounded evidence.
5. The packet becomes immutable after deadline or two-party early freeze.
6. GenLayer adjudicates the frozen packet.
7. The result references accepted clauses and evidence IDs.
8. A single bounded review route can reconsider the original case.
9. A CHANGE_REQUEST can create a separately accepted Change Order.

Do not add escrow, payments, tokenomics, public reputation scores, arbitrary
web crawling, private-case promises, agent execution, or unrelated social
features to v1.

────────────────────────────────────────────────────────────────────────────
WORKING STYLE
────────────────────────────────────────────────────────────────────────────

Build a clean-room repository. Start by creating the architecture and
specification artifacts before implementation.

Use progressive disclosure:
- Keep root AGENTS.md concise.
- Create focused docs for contract/security, backend/configuration, design,
  testing/release, architecture, and deployment.
- Read the focused document only when doing that class of work.
- Do not load every document before every small edit.

Use Spec Kit or an equivalent compatible project-local adapter:
- Constitution once.
- Feature specification.
- Technical plan.
- Dependency-ordered tasks.
- Implementation.
- Convergence/review.
- Requirement-to-test traceability matrix.

Use Ponytail principles:
- Make the smallest complete implementation.
- Reuse existing platform/library capabilities.
- Avoid dependencies, abstractions and microservices unless necessary.
- Never cut validation, security, error handling, testing, accessibility or
  useful documentation for brevity.
- Any meaningful branch, parser, security rule, lifecycle state transition or
  contract rule needs focused test coverage.
- Run a whole-repository senior audit before release.

Use Playwright:
- Cross-browser tests in Chromium, Firefox and WebKit.
- Semantic locators and isolated browser contexts.
- Trace/screenshots/video on failure.
- Actual production build for final browser tests.
- No success condition based on arbitrary sleep.
- No hidden browser-script calls that bypass visible product interactions.

Continue through reversible local work autonomously:
- Inspect/edit local files.
- Install verified project dependencies.
- Create local/disposable databases.
- Generate safe local secrets.
- Run tests, builds, linting and QA.
- Fix defects you discover.
- Create documentation and local CI.

Ask for input only when a missing detail materially changes design, or before:
- Studio deployment.
- Any real chain write.
- Wallet approval.
- Publishing, pushing a repository, buying a service, or changing production.
- Creating/using a real WalletConnect Cloud project ID.
- Deleting non-disposable user data.

Do not stop after scaffolding, a green build, or a pretty landing page.
Do not declare complete until the explicit Definition of Done passes.

────────────────────────────────────────────────────────────────────────────
MANDATORY STACK
────────────────────────────────────────────────────────────────────────────

Frontend:
- Next.js App Router with TypeScript.
- Server-first architecture.
- Route-level code splitting.
- Strict TypeScript.
- RainbowKit + wagmi + viem for wallet connectivity.
- genlayer-js for GenLayer contract interaction.
- User wallet signs every network write.
- No server private key, mnemonic, generated account or backend transaction signer.
- WalletConnect is optional until a real user-supplied project ID exists.
  Do not invent a WalletConnect project ID.

Backend:
- TypeScript application API/service layer.
- PostgreSQL.
- A mature migration approach such as Prisma, unless a simpler existing
  project-native solution is superior.
- Secure wallet-based auth with a signed nonce, expiry, domain/origin binding,
  replay prevention and secure HttpOnly sessions.
- Team workspace support: owner/member, invitation, removal, shared drafts,
  audit/activity log and opt-in notification preferences.
- Team membership does not authorize on-chain signatures.
- No backend result can replace chain truth.
- No backend signer.

Contract:
- Python.
- gl.Contract structure.
- Keep the top-of-file # Depends declaration.
- Use only persistent storage and ABI types actually supported by the pinned
  GenLayer runtime.
- Pin and document the exact runtime/SDK versions after verification.
- All state-changing methods reject non-zero value because v1 has no payment.
- No owner/admin override, pause, upgrade, hidden authority, token transfer,
  cross-contract payment or privileged backdoor.

Do not assume APIs. Verify real installed GenLayer APIs before implementation,
including:
- gl.Contract decorators and persistent storage.
- gl.message sender/value/time behavior.
- gl.nondet.exec_prompt signature.
- gl.eq_principle prompt comparison API.
- gl.nondet.web.render API.
- genlayer-test Direct Mode APIs.
- genlayer-js wallet signing integration.
- Studio deployment format and constructor handling.

────────────────────────────────────────────────────────────────────────────
ENVIRONMENT AND CONFIGURATION
────────────────────────────────────────────────────────────────────────────

Create:
- .env.example
- a safe idempotent local bootstrap script
- configuration validation
- a redacted environment readiness report

The bootstrap must create .env from .env.example only if .env does not exist.
It must never overwrite existing values or print secrets.

Generate only safe local secrets using cryptographic randomness:
- SESSION_SECRET
- local database password when a disposable local database is created
- internal development keys where strictly required

Do not fabricate:
- WalletConnect project IDs
- deployed contract addresses
- production database URLs
- real RPC credentials
- external mail credentials
- Studio transaction hashes
- user wallet addresses

Important settings must be read from environment variables, including:
- DATABASE_URL
- SESSION_SECRET
- APP_ORIGIN
- ALLOWED_ORIGINS
- GENLAYER_RPC_URL
- NEXT_PUBLIC_GENLAYER_RPC_URL only if public and non-secret
- NEXT_PUBLIC_GENLAYER_CHAIN_ID
- NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- feature flags
- logging level
- API limits
- notification settings

Never expose secrets through NEXT_PUBLIC variables.
Clearly document build-time versus runtime browser configuration.

The contract cannot read host environment variables during execution.
Contract policy must be versioned and committed inside source/on-chain state,
not mutable through backend configuration.

────────────────────────────────────────────────────────────────────────────
CONTRACT PRODUCT SPECIFICATION
────────────────────────────────────────────────────────────────────────────

Implement a bounded state machine.

Agreement:
- Exactly two distinct addresses: developer and client.
- Structured Scope Card with:
  - title
  - broken behavior
  - expected behavior
  - covered environment/platform
  - baseline/reference version
  - included clauses: S-*
  - excluded clauses: X-*
  - acceptance criteria: A-*
  - protected behaviors: P-*
- Require at least one S-* and one A-* clause.
- Validate IDs, types, max lengths, duplicate IDs, unknown fields and JSON
  duplicate keys deterministically.
- Agreement is versioned.
- Acceptance binds to exact version and canonical agreement hash.
- Revision preserves history and invalidates prior approval.
- Active agreement is immutable.
- Proposal can expire or be rejected.

Case:
- One atomic request only.
- Frontend preflight gives helpful feedback for likely non-atomic requests.
- Contract remains final and safely rejects/reclassifies invalid requests.
- Both parties may submit bounded append-only statement history.
- Evidence is bounded and typed:
  BASELINE_REPORT, POST_PATCH_REPORT, TEST_REPORT, PUBLIC_EXCERPT.
- Each evidence record has ID, submitter, content hash, bounded content,
  reference/version/scenario/environment fields and provenance label.
- Counterparty can acknowledge exact evidence content hash.
- Acknowledgment does not mean independent verification.
- Public reference does not mean authenticated truth.

Freeze:
- Response/evidence/acknowledgment deadline controlled by trusted GenLayer
  transaction context.
- Fail closed if trusted time is unavailable or malformed.
- Do not accept caller/browser/server timestamps.
- Two parties may early-freeze only the exact current canonical packet.
- Any changed input invalidates early-freeze approvals.
- Freeze packet contains agreement snapshot, policy/version/hash, request,
  current statements/history, evidence, acknowledgments and review context.
- No mutable web page is refetched during adjudication.
- No changes after freeze.
- Contract enforces bounded packet size before accepting new input.

Decision:
- Only one initial decision per frozen case.
- Strict structured output:
  classification, reason_code, clause_refs, evidence_refs, summary,
  missing_evidence, limitations, review_status.
- Validate every reference against frozen packet IDs.
- Validate classification/reason combinations deterministically.
- Operational/model/transport parse failure must not become a business verdict.
- Result is not an execution-quality, legal or payment decision.

Protected regression:
- Never use keyword checks as causal proof.
- Require a valid P-* clause.
- Require structured, identifiable baseline and post-patch evidence.
- Require matching protected scenario.
- Require compatible environment/platform.
- Require declared pre-patch versus post-patch state.
- Require permitted evidence references inside the frozen packet.
- If those conditions are missing, result must be
  CAUSATION_NOT_ESTABLISHED or INSUFFICIENT_EVIDENCE.
- The LLM may reason over admissible evidence but cannot bypass this
  deterministic gate.

Review:
- One shared review round per initial case.
- Valid grounds:
  NEW_EVIDENCE or OVERLOOKED_REFERENCE.
- Preserve original request, agreement, packet and decision.
- No recursive review.
- UPHELD, REVISED or REVIEW_NOT_ADMISSIBLE.
- REVISED only if classification changes under v1 policy.
- Review deadline and state transitions must be enforced.

Change order:
- Only after effective CHANGE_REQUEST.
- New separate agreement.
- Requires independent two-party acceptance.
- Never mutates prior agreement/decision.
- No price/payment automation in v1.

Pagination:
- All agreement/case list views must use cursor/limit pagination.
- Limit max page size to 50.
- Validate cursor and bounds.
- Return stable ordering and explicit next cursor behavior.

────────────────────────────────────────────────────────────────────────────
GENLAYER NONDETERMINISM AND WEB RULES
────────────────────────────────────────────────────────────────────────────

Every consensus-critical nondeterministic operation must use meaningful
GenLayer equivalence logic.

Use gl.eq_principle / prompt_comparative or the verified equivalent around:
- LLM adjudication.
- Any LLM-based text interpretation.
- Any web rendering/extraction that changes a decision.

Do not use an equivalence validator that always returns true.
Define comparison criteria that require equivalent:
- classification
- reason code
- referenced clauses/evidence as sets, not arbitrary order
- review status
- material evidence-gap conclusion

Summary wording may vary only if its meaning stays grounded in the same data.

Prompt injection defense:
- Consensus only detects disagreement; it does not protect against every
  validator being manipulated identically.
- Treat agreement text, user statements, evidence, URLs, HTML, Markdown,
  quoted instructions, model output and prior summaries as untrusted data.
- Keep contract policy and allowed outcomes separate from untrusted content.
- Bound, normalize and validate fields before entering equivalence.
- Use deterministic guards for permissions, state transitions, IDs,
  references, evidence type, deadlines, packet integrity and output schema.
- Do not let user content choose tools, policies, outcomes or side effects.
- Add prompt-injection tests:
  direct injection, indirect webpage injection, fake system messages,
  role impersonation, forged IDs, encoded/Unicode/control text,
  Markdown/JSON boundary escapes, prior-summary manipulation and attacks
  attempting to make all validators return the same forbidden verdict.
- A shared invalid verdict is a real security failure.
  Fix the root trust boundary, narrow scope or fail closed.

Web access:
- Core v1 must work without arbitrary web fetches.
- Web evidence import is optional and feature-gated.
- If enabled, use only gl.nondet.web.render inside the supported VM/equivalence
  path.
- Never use requests/httpx/backend fetch as consensus truth.
- Never adjudicate a live mutable URL; persist a bounded accepted snapshot
  as evidence before freeze.
- Allow HTTPS public sources only.
- Block localhost, private/link-local/metadata IPs, credentials in URLs,
  IP literal targets, unsupported ports and unsafe redirects.
- Bound URL length, redirects, response size and extraction depth.
- If the runtime cannot safely enforce these constraints, disable web import
  and accept only user-provided frozen excerpts labeled unverified.

────────────────────────────────────────────────────────────────────────────
FRONTEND, UX AND LIQUID GLASS DESIGN
────────────────────────────────────────────────────────────────────────────

Create a premium, calm, human-centered Web3 application.
It must not look like generic AI slop.

Visual direction:
- Warm stone/ivory background.
- Near-black text.
- Deep natural forest green.
- Restrained terracotta and amber accents.
- Carefully used Liquid Glass surfaces:
  translucent navigation, selected cards and overlays.
- Dense content, forms, evidence panels and tables must use sufficiently
  opaque surfaces for reliable readability.
- Controlled backdrop blur and fine borders.
- No default purple/cyan AI gradient.
- No neon glows, floating-orb hero art, generic dashboard cards or fake
  metrics.
- Use readable open-license typography, self-hosted when practical.
- Use a clear display serif only where it improves editorial hierarchy,
  plus an excellent sans and a monospace face for hashes/addresses.
- Respect reduced motion and support blur-disabled fallbacks.

Required screens:
- Professional landing page.
- Documentation page.
- Public roadmap page.
- Dashboard.
- Agreement wizard.
- Agreement detail and version history.
- Case creation.
- Two-party case workspace.
- Evidence inspector.
- Decision detail.
- Review flow.
- Change-order flow.
- Workspace/team settings.
- Notification preferences.
- Public contract read diagnostics.
- Privacy/security disclosure.
- Empty/loading/error/recovery states everywhere relevant.

Landing page must contain:
- Clear promise: “Is this still the fix—or a new request?”
- Working CTA.
- One clearly labelled example.
- Agree -> respond -> freeze -> decide -> amend narrative.
- Explanation of all three outcomes.
- Public-data/privacy warning.
- Honest self-review/security statement.
- FAQ.
- Docs and roadmap links.
- No fabricated customers, audits, chain metrics, funding claims, logos,
  partner claims or testimonial quotes.

Accessibility and UX:
- Semantic HTML.
- Keyboard navigation.
- visible focus states.
- labels and error announcements.
- touch targets.
- reduced motion.
- contrast target WCAG 2.2 AA.
- no horizontal overflow at 320, 390, 720, 768 and 1440 CSS px.
- test actual browser zoom 200% where supported, not only narrow viewport.
- wallet rejection, wrong network, disconnect, account switch, pending
  transaction, stale data, missing record, network outage and backend outage
  must have human-readable recovery states.
- Never show an unobservable write as failed.
- Preserve transaction hash and provide read-only status checking.
- Prevent accidental duplicate submit/retry.
- Wallet transaction success must distinguish submitted, accepted, finalized,
  execution successful, execution failed and unknown state.

Performance:
- Marketing/docs/roadmap pages remain server/static-first and must not load
  wallet or contract code unnecessarily.
- Wallet/workspace/diagnostics code must load only where needed.
- Do not fetch dynamic configuration on every marketing route unless needed.
- Measure actual bundle composition and Lighthouse.
- Target mobile Lighthouse median >=85 for landing; report actual values.

────────────────────────────────────────────────────────────────────────────
BACKEND, DATA AND TEAM REQUIREMENTS
────────────────────────────────────────────────────────────────────────────

Keep backend architecture simple and professional.

Required:
- PostgreSQL migrations.
- Strong schema constraints and indexes.
- Wallet authentication nonce:
  single-use, expiry, address/chain/domain/origin binding.
- Signature verification.
- HttpOnly Secure cookies in production.
- CSRF/origin protection.
- Rate limiting stored in PostgreSQL or proven shared infrastructure.
  No process-local rate limiter as the sole production control.
- HMAC or privacy-preserving IP keying when rate limiting by IP.
- Input/body bounds.
- Team owner/member controls.
- Invite/removal flows with authorization tests.
- Removing a person from one team must not delete their global session or
  memberships in other teams.
- Private drafts and workspace metadata must be permission checked.
- Prevent IDOR/BOLA.
- Draft autosave/version conflict handling.
- Activity/audit records.
- Notification settings only for a real active delivery path.
  Do not collect email data merely for future ideas.
- If notifications are unavailable, omit email collection and document it.
- Health/readiness checks.
- Structured redacted logs with correlation IDs.
- Error boundaries and safe client error responses.
- Migration/runbook/documentation.

Do not build an unverified indexer for v1.
For authoritative agreement/case/decision state, browser reads use verified
GenLayer RPC/contract views.
Backend may store drafts, workspace data, user preferences and non-authoritative
metadata only. UI must clearly distinguish on-chain data from local/off-chain
draft data.

────────────────────────────────────────────────────────────────────────────
SECURITY AND OPEN-SOURCE REQUIREMENTS
────────────────────────────────────────────────────────────────────────────

Create:
- SECURITY_FINDINGS.md
- threat model
- architecture diagram
- trust-boundary diagram
- security disclosure policy
- dependency/security scan report
- release checklist
- deployment runbook
- incident/recovery notes
- README
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- LICENSE
- CHANGELOG.md
- docs/roadmap.md
- docs/architecture.md
- docs/contract.md
- docs/configuration.md
- docs/testing.md
- docs/deployment.md

For each security finding include:
- ID
- severity
- component/location
- precondition
- reproduction
- impact
- root cause
- remediation
- regression test
- status
- remaining risk

Use SELF_REVIEW unless a real third-party audit has occurred.
Never claim Gold tier, audited, externally verified, exploit-proof or
bug-free without authentic external evidence.

Run dependency scans.
For each advisory, determine dependency path, runtime reachability, exploit
precondition, fix, compatibility impact and mitigation.
Do not silently ignore high severity advisories.

────────────────────────────────────────────────────────────────────────────
TESTING AND RELEASE GATES
────────────────────────────────────────────────────────────────────────────

Direct Mode:
- Use actual genlayer-test Direct Mode without Docker.
- Use official mock_llm/mock_web APIs after verifying installed syntax.
- Do not treat a hand-written fake gl module as Direct Mode proof.
- Test contract lifecycle, authorization, canonicalization, deadline
  boundaries, evidence/freeze integrity, structured regression gate,
  output parser, invalid model responses, provider failures, review,
  change order, pagination and no-mutation reads.
- Test prompt injection and forbidden verdict invariants.
- Run in CI.

Studio Mode:
- Prepare deployment for https://studio.genlayer.com/contracts.
- Deploy only after the user manually approves the exact source hash,
  network/account, constructor arguments and value.
- No scripted deployment.
- Use actual Studio model/validator configuration available.
- Record deployment receipt, address, runtime details and test evidence.
- Run real contract integration flow in Studio.
- Do not say Studio proves full live-network Optimistic Democracy, appeal,
  economic conditions or independent decentralization if it does not.

Frontend QA:
- Build production artifact.
- Run cold Playwright suite with fresh servers.
- Chromium, Firefox and WebKit.
- No hidden retries in final release test.
- Trace/video/screenshots on failure.
- Test real user flows with deterministic injected-wallet mocks.
- Then execute at least one real user-wallet browser journey after manual
  approval. Label mock and real evidence separately.
- Never automatically approve wallet prompts.
- Verify console errors, failed requests, accessibility, responsive layout,
  zoom, deep links, error states and performance.

Real frontend-led on-chain journey after Studio deployment:
- Use visible dApp controls only for writes.
- Use two user-controlled personas: Developer and Client.
- Create agreement, revise/reject, accept exact version, create case,
  submit statements/evidence, acknowledge evidence, invalid/valid freeze,
  request decision, inspect decision, review, change order, history.
- Test wallet rejection, wrong network/account, disconnect, refresh,
  duplicate clicks, RPC failure, stale hash/version and missing IDs.
- Test every public read method through visible frontend diagnostics controls.
- Record inputs, expected/actual output, network context and read artifact.
- Never invent read transaction hashes.

Quality gates:
- Contract Direct Mode: green.
- Contract lint/typecheck: green.
- Studio Mode: green after manual deployment.
- Backend unit/integration/security tests: green.
- Typecheck/lint/build: green.
- Browser QA: green across three engines.
- Accessibility: no serious/critical automated findings on required screens.
- Landing performance: measured and reported.
- No unresolved Critical/High security finding.
- All documentation matches actual behavior.
- Run a final Ponytail-style whole repository audit.

────────────────────────────────────────────────────────────────────────────
DEPLOYMENT BOUNDARY
────────────────────────────────────────────────────────────────────────────

Before Studio deployment:
1. Complete all safe local work.
2. Recompute exact contract source SHA-256 and byte count.
3. Prepare docs/DEPLOY_APPROVAL.md with:
   - Studionet / exact network selected from verified current Studio docs/UI
   - chain ID
   - RPC endpoint
   - exact contract file
   - source SHA-256
   - constructor args
   - transaction value
   - runtime version
   - public methods
   - unresolved limitations
4. Show the complete request to the user.

Wait for explicit approval.
The user must manually inspect and sign the Studio wallet prompt.

After deploy:
- Use returned real contract address and receipt only.
- Configure application with verified address.
- Rebuild/restart cleanly.
- Run deployed public read matrix.
- Run browser-led two-party journey.
- Run Studio semantic and injection benchmark with at least 60 labelled cases.
- If any issue appears, reproduce, add regression, fix root cause, redeploy
  only if contract source changed, then repeat affected tests.
- Source changes invalidate previous deployment approval and need a new one.

────────────────────────────────────────────────────────────────────────────
DEFINITION OF DONE
────────────────────────────────────────────────────────────────────────────

Do not report COMPLETE_VERIFIED unless all of the following are true:

1. PatchScope v1 exists as clean readable open-source-ready code.
2. .env.example, safe .env bootstrap and config validation exist.
3. Backend, database, auth, team/drafts and reliability paths work.
4. Contract is Python gl.Contract with # Depends preserved.
5. Contract deterministic integrity rules and consensus nondeterminism are
   correctly separated.
6. Prompt injection and external input defenses are tested.
7. RainbowKit + genlayer-js user-wallet signing works.
8. No server key or backend signing exists.
9. Landing, docs and roadmap are complete and professional.
10. Direct Mode passes.
11. Studio Mode passes after manual deployment.
12. Every deployed public read method passes.
13. Complete two-party dApp journey is executed from frontend controls only.
14. Browser QA passes in Chromium, Firefox and WebKit.
15. Critical/High security findings are resolved.
16. Security findings, known limitations and remaining risks are documented.
17. Final report contains real evidence.

If Studio/manual wallet approval, real WalletConnect ID, external runtime
capability or network access is unavailable, do not fabricate evidence.
Continue all independent work, mark status PARTIAL/BLOCKED, list the exact
missing item and leave a resumable deployment package.

────────────────────────────────────────────────────────────────────────────
FINAL REPORT
────────────────────────────────────────────────────────────────────────────

Write FINAL_REPORT.md in Persian and include:

- Final status: COMPLETE_VERIFIED, PARTIAL or BLOCKED.
- What was built.
- Contract source SHA-256 and runtime versions.
- Contract address, network and chain ID.
- Deployment transaction hash and receipt status.
- Table of real user-signed write transactions:
  action, persona, method, hash, expected/actual outcome.
- Full deployed public read matrix:
  view, arguments, expected/actual result, RPC evidence.
- Direct Mode, Studio Mode, backend, frontend, Playwright, accessibility and
  performance results.
- Actual model/provider/validator limitations.
- Security findings by severity/status.
- Explicit SELF_REVIEW statement.
- Frontend score /10:
  user flow 25%, accessibility/responsiveness 25%, visual quality/readability
  20%, recovery/error handling 20%, measured performance 10%.
- Backend score /10:
  correctness 25%, security 25%, reliability 20%, maintainability 15%,
  performance/observability 15%.
- Scores must be evidence-based. Use N/A or NOT_MEASURED where applicable.
- Roadmap of implemented v1, unresolved risks and next priorities.
- Never claim the absence of all bugs.

BEGIN NOW.

First:
1. Create concise AGENTS.md and project-local instruction docs.
2. Create Spec Kit constitution/spec/plan/tasks artifacts.
3. Produce a short architecture and threat-model report.
4. Implement the smallest complete contract vertical slice.
5. Continue autonomously through local completion and release gates.
6. Ask only when Studio deployment approval or a real external credential is
   required.