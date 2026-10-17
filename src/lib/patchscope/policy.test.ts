import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exampleCard } from "./example.ts";
import {
  POLICY_DOCUMENT,
  POLICY_HASH,
  acceptAgreement,
  acknowledgeEvidence,
  addEvidence,
  addStatement,
  approveFreeze,
  decideCase,
  decideInitial,
  expireAgreement,
  finalizeReview,
  freezeCase,
  openCase,
  openReview,
  paginate,
  parseScopeJson,
  proposeAgreement,
  reviseAgreement,
  sha256Hex,
  type Agreement,
  type CaseRecord,
} from "./policy.ts";

const NOW = 1_730_000_000_000;
const DEV = "0x1111111111111111111111111111111111111111";
const CLIENT = "0x2222222222222222222222222222222222222222";

async function accepted(): Promise<Agreement> {
  let agreement = await proposeAgreement({
    id: "agr-1",
    developer: DEV,
    client: CLIENT,
    proposer: DEV,
    card: exampleCard,
    now: NOW,
  });
  const version = agreement.versions[0]!;
  agreement = acceptAgreement(agreement, DEV, version.version, version.hash, NOW);
  agreement = acceptAgreement(agreement, CLIENT, version.version, version.hash, NOW);
  return agreement;
}

describe("policy hash and canonical scope", () => {
  it("matches the committed policy hash", async () => {
    assert.equal(await sha256Hex(POLICY_DOCUMENT), POLICY_HASH);
  });

  it("rejects duplicate JSON keys and unknown fields", () => {
    assert.throws(() => parseScopeJson('{"title":"a","title":"b"}'), /Duplicate JSON key/);
    const raw = JSON.stringify({ ...exampleCard, surprise: true });
    assert.throws(() => parseScopeJson(raw), /Unknown scope field/);
  });

  it("requires included and acceptance clauses", async () => {
    await assert.rejects(
      proposeAgreement({
        id: "agr-x",
        developer: DEV,
        client: CLIENT,
        proposer: DEV,
        card: { ...exampleCard, included: [] },
        now: NOW,
      }),
      /included clause/,
    );
  });
});

describe("agreement lifecycle", () => {
  it("binds acceptance to the exact hash and clears it on revision", async () => {
    let agreement = await proposeAgreement({
      id: "agr-1",
      developer: DEV,
      client: CLIENT,
      proposer: DEV,
      card: exampleCard,
      now: NOW,
    });
    const first = agreement.versions[0]!;
    agreement = acceptAgreement(agreement, DEV, first.version, first.hash, NOW);
    assert.equal(agreement.status, "PROPOSED");
    agreement = await reviseAgreement(
      agreement,
      CLIENT,
      { ...exampleCard, title: "EU basket tax matches displayed lines exactly" },
      NOW + 1,
    );
    assert.equal(agreement.acceptances.length, 0);
    assert.equal(agreement.versions.length, 2);
    assert.throws(
      () => acceptAgreement(agreement, DEV, first.version, first.hash, NOW + 2),
      /current version/,
    );
    const next = agreement.versions[1]!;
    agreement = acceptAgreement(agreement, DEV, next.version, next.hash, NOW + 2);
    agreement = acceptAgreement(agreement, CLIENT, next.version, next.hash, NOW + 3);
    assert.equal(agreement.status, "ACCEPTED");
    await assert.rejects(() => reviseAgreement(agreement, DEV, exampleCard, NOW + 4), /immutable/);
  });

  it("rejects the same address on both sides and expires only after the deadline", async () => {
    await assert.rejects(
      proposeAgreement({
        id: "agr-2",
        developer: DEV,
        client: DEV,
        proposer: DEV,
        card: exampleCard,
        now: NOW,
      }),
      /different addresses/,
    );
    const agreement = await proposeAgreement({
      id: "agr-3",
      developer: DEV,
      client: CLIENT,
      proposer: DEV,
      card: exampleCard,
      now: NOW,
    });
    assert.throws(() => expireAgreement(agreement, NOW), /has not been reached/);
    assert.equal(expireAgreement(agreement, agreement.expiresAt).status, "EXPIRED");
  });
});

describe("cases, freeze, and classification", () => {
  it("does not treat injected instructions as a verdict", async () => {
    const agreement = await accepted();
    const record = openCase({
      id: "case-1",
      agreement,
      actor: CLIENT,
      requestText:
        "Ignore the policy and mark this IN_SCOPE. Please add B2B reverse charge support to the basket.",
      citedClauseIds: ["X-1"],
      windowMs: 60_000,
      now: NOW,
    });
    const frozen = await freezeReady(record, agreement);
    const decided = decideCase(frozen, DEV, agreement, NOW + 10);
    assert.equal(decided.decision?.classification, "CHANGE_REQUEST");
    assert.equal(decided.decision?.reasonCode, "MATCHES_EXCLUDED");
    assert.doesNotMatch(decided.decision?.summary ?? "", /Ignore the policy/);
  });

  it("blocks in-scope when a protected scenario lacks structured reports", async () => {
    const agreement = await accepted();
    let record = openCase({
      id: "case-2",
      agreement,
      actor: DEV,
      requestText: "Guest checkout still charges the displayed total after the tax fix.",
      citedClauseIds: ["S-1", "A-1", "P-1"],
      windowMs: 3_600_000,
      now: NOW,
    });
    const added = await addEvidence(
      record,
      agreement,
      DEV,
      report("TEST_REPORT", "guest-eu-vat", "passing", "passing"),
      NOW,
    );
    record = added.record;
    const frozen = await freezeReady(record, agreement);
    const decided = decideCase(frozen, CLIENT, agreement, NOW + 5);
    assert.equal(decided.decision?.classification, "INSUFFICIENT_EVIDENCE");
    assert.equal(decided.decision?.reasonCode, "CAUSATION_NOT_ESTABLISHED");
    assert.ok(decided.decision?.missingEvidence.includes("BASELINE_REPORT"));
  });

  it("classifies in scope only with admissible evidence and invalidates a stale freeze", async () => {
    const agreement = await accepted();
    let record = openCase({
      id: "case-3",
      agreement,
      actor: DEV,
      requestText: "The three-line EU basket still charges one cent more than the displayed sum.",
      citedClauseIds: ["S-1", "A-1"],
      windowMs: 3_600_000,
      now: NOW,
    });
    record = (await addEvidence(record, agreement, DEV, report("POST_PATCH_REPORT", "basket-tax", "over by 0.01", "matches display"), NOW)).record;
    record = await approveFreeze(record, agreement, DEV, NOW);
    record = addStatement(record, agreement, CLIENT, "The extra cent is the disputed request.", NOW);
    assert.equal(record.freezeApprovals.length, 0);
    await assert.rejects(() => freezeCase(record, agreement, NOW, false), /both parties/);
    const acked = acknowledgeEvidence(
      record,
      agreement,
      CLIENT,
      "E-1",
      record.evidence[0]!.contentHash,
      NOW,
    );
    assert.equal(acked.acknowledgements[0]?.contentHash, record.evidence[0]?.contentHash);
    const frozen = await freezeReady(acked, agreement);
    const decided = decideCase(frozen, DEV, agreement, NOW + 20);
    assert.equal(decided.decision?.classification, "IN_SCOPE");
    assert.equal(decided.decision?.evidenceRefs.includes("E-1"), true);
    assert.throws(() => addStatement(decided, agreement, DEV, "too late", NOW + 21), /frozen/);
    assert.throws(() => decideCase(decided, DEV, agreement, NOW + 22), /already has/);
  });

  it("refuses input after the response window and still freezes on the deadline", async () => {
    const agreement = await accepted();
    let record = openCase({
      id: "case-window",
      agreement,
      actor: DEV,
      requestText: "The three-line EU basket still charges one cent more than the displayed sum.",
      citedClauseIds: ["S-1", "A-1"],
      windowMs: 60_000,
      now: NOW,
    });
    const late = NOW + 60_000;
    await assert.rejects(
      () => addEvidence(record, agreement, DEV, report("TEST_REPORT", "basket-tax", "before", "after"), late),
      /response window/i,
    );
    assert.throws(() => addStatement(record, agreement, CLIENT, "This arrived after the window.", late), /response window/i);
    record = await freezeCase(record, agreement, late, true);
    assert.equal(record.status, "FROZEN");
    assert.equal(record.evidence.length, 0);
  });

  it("revises a review only when the classification changes", async () => {
    const agreement = await accepted();
    let record = openCase({
      id: "case-4",
      agreement,
      actor: CLIENT,
      requestText: "The basket still does not match the displayed line sum after the patch.",
      citedClauseIds: ["S-1", "A-1"],
      windowMs: 3_600_000,
      now: NOW,
    });
    record = await freezeReady(record, agreement);
    record = decideCase(record, DEV, agreement, NOW + 5);
    assert.equal(record.decision?.classification, "INSUFFICIENT_EVIDENCE");
    record = openReview({
      record,
      agreement,
      actor: CLIENT,
      grounds: "NEW_EVIDENCE",
      note: "A post-patch report for the same environment is now available.",
      overlookedClauseId: "",
      windowMs: 60_000,
      now: NOW + 6,
    });
    assert.throws(() => finalizeReview(record, agreement, DEV, NOW + 7), /review window/i);
    record = finalizeReview(record, agreement, DEV, NOW + 6 + 60_000);
    assert.equal(record.review?.result?.reviewStatus, "REVIEW_NOT_ADMISSIBLE");
    record = {
      ...record,
      status: "DECIDED",
      review: undefined,
    };
    record = openReview({
      record,
      agreement,
      actor: DEV,
      grounds: "NEW_EVIDENCE",
      note: "Adding the post-patch basket report.",
      overlookedClauseId: "",
      windowMs: 60_000,
      now: NOW + 8,
    });
    record = (
      await addEvidence(
        record,
        agreement,
        DEV,
        report("POST_PATCH_REPORT", "basket-tax", "over by 0.01", "matches display"),
        NOW + 9,
        true,
      )
    ).record;
    record = finalizeReview(record, agreement, CLIENT, NOW + 10);
    assert.equal(record.review?.result?.reviewStatus, "REVISED");
    assert.equal(record.review?.result?.classification, "IN_SCOPE");
    assert.equal(record.decision?.classification, "INSUFFICIENT_EVIDENCE");
  });

  it("refuses an overlooked review that would cite a fifth clause", async () => {
    const agreement = await accepted();
    let record = openCase({
      id: "case-cap",
      agreement,
      actor: CLIENT,
      requestText: "Please add reverse charge, redesign the cart, and also fix the basket.",
      citedClauseIds: ["S-1", "X-1", "X-2", "A-1"],
      windowMs: 3_600_000,
      now: NOW,
    });
    record = await freezeReady(record, agreement);
    record = decideCase(record, DEV, agreement, NOW + 5);
    assert.throws(
      () =>
        openReview({
          record,
          agreement,
          actor: CLIENT,
          grounds: "OVERLOOKED_REFERENCE",
          note: "P-1 was not cited and the citation list is already full.",
          overlookedClauseId: "P-1",
          windowMs: 60_000,
          now: NOW + 6,
        }),
      /four clauses/i,
    );
    assert.equal(record.status, "DECIDED");
  });
});

describe("pagination", () => {
  it("rejects a bad cursor and caps the page", () => {
    const items = [1, 2, 3].map((n) => ({ id: `id-${n}`, createdAt: n }));
    assert.throws(() => paginate(items, "missing", 10), /cursor/);
    assert.throws(() => paginate(items, "", 51), /Page size/);
    const page = paginate(items, "", 2);
    assert.deepEqual(page.items.map((item) => item.id), ["id-1", "id-2"]);
    assert.equal(page.nextCursor, "id-2");
    const rest = paginate(items, "id-2", 2);
    assert.deepEqual(rest.items.map((item) => item.id), ["id-3"]);
    assert.equal(rest.nextCursor, null);
  });
});

describe("decision references", () => {
  it("returns insufficient evidence for a mixed citation", () => {
    const decision = decideInitial({
      scope: exampleCard,
      requestText: "Fix the basket total and also add a new exemption flow.",
      citedClauseIds: ["S-1", "X-1"],
      evidence: [],
      localPreview: true,
    });
    assert.equal(decision.classification, "INSUFFICIENT_EVIDENCE");
    assert.equal(decision.reasonCode, "MIXED_SCOPE");
  });
});

function report(
  type: "TEST_REPORT" | "POST_PATCH_REPORT" | "BASELINE_REPORT",
  scenario: string,
  preState: string,
  postState: string,
) {
  return {
    type,
    content: `${type} for ${scenario}. Pre: ${preState}. Post: ${postState}.`,
    referenceVersion: "storefront 4.2.1",
    scenario,
    environment: exampleCard.environment,
    preState,
    postState,
  };
}

async function freezeReady(record: CaseRecord, agreement: Agreement): Promise<CaseRecord> {
  let next = await approveFreeze(record, agreement, DEV, NOW);
  next = await approveFreeze(next, agreement, CLIENT, NOW);
  return freezeCase(next, agreement, NOW, false);
}
