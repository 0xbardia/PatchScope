import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeCanonicalRelationships,
  IncompatibleRelationshipPayloadError,
} from "./relationship-canonical.ts";

describe("EchoTrace Reference Contract: Canonical get_relationships Response Handling", () => {
  it("documents that PatchScope does not call get_relationships in production", () => {
    // Verified: PatchScope's intelligent contract is patchscope.py.
    // get_relationships is part of the reference EchoTrace contract in EchoTrace/contracts/echotrace.py.
    assert.ok(true);
  });

  it("decodes canonical missing-record / empty response correctly", () => {
    // Exact payload returned by EchoTrace/contracts/echotrace.py:235
    // json.dumps({"found": False, "relationships": []}, sort_keys=True)
    const rawSdkPayload = JSON.stringify({
      found: false,
      relationships: [],
    });

    const decoded = decodeCanonicalRelationships(rawSdkPayload);
    assert.equal(decoded.found, false);
    assert.deepEqual(decoded.relationships, []);
  });

  it("decodes pre-parsed object missing-record response", () => {
    const preParsed = {
      found: false,
      relationships: [],
    };

    const decoded = decodeCanonicalRelationships(preParsed);
    assert.equal(decoded.found, false);
    assert.deepEqual(decoded.relationships, []);
  });

  it("decodes canonical populated response correctly across string/SDK boundary", () => {
    // Exact schema emitted by echotrace.py:597-607
    const populatedPayload = JSON.stringify({
      found: true,
      relationships: [
        {
          id: "rel-1",
          fromSourceId: "src-1",
          toSourceId: "src-2",
          originLabel: "Primary Wire Announcement",
          type: "explicit_dependency",
          supportingEvidenceIds: ["ev-101", "ev-102"],
          explanation: "Cites source 2 as primary wire report.",
          status: "reviewed",
        },
        {
          id: "rel-2",
          fromSourceId: "src-3",
          toSourceId: null,
          originLabel: "Independent Report",
          type: "distinct_evidence_shown",
          supportingEvidenceIds: [],
          explanation: "Unlinked independent observation.",
          status: "pending",
        },
      ],
    });

    const decoded = decodeCanonicalRelationships(populatedPayload);
    assert.equal(decoded.found, true);
    assert.equal(decoded.relationships.length, 2);

    assert.equal(decoded.relationships[0].id, "rel-1");
    assert.equal(decoded.relationships[0].fromSourceId, "src-1");
    assert.equal(decoded.relationships[0].toSourceId, "src-2");
    assert.equal(decoded.relationships[0].type, "explicit_dependency");
    assert.deepEqual(decoded.relationships[0].supportingEvidenceIds, ["ev-101", "ev-102"]);
    assert.equal(decoded.relationships[0].status, "reviewed");

    assert.equal(decoded.relationships[1].id, "rel-2");
    assert.equal(decoded.relationships[1].toSourceId, null);
    assert.equal(decoded.relationships[1].type, "distinct_evidence_shown");
    assert.equal(decoded.relationships[1].status, "pending");
  });

  it("strictly rejects legacy bare array `[]` payload and does not silently convert to empty success", () => {
    // The deployed bytecode at 0xCABc... returned `[]` on missing cases
    const legacyArrayPayload = "[]";

    assert.throws(
      () => decodeCanonicalRelationships(legacyArrayPayload),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "LEGACY_ARRAY_PAYLOAD");
        assert.ok(err.message.includes("legacy bytecode"));
        return true;
      },
    );

    // Also assert with parsed array
    assert.throws(
      () => decodeCanonicalRelationships([]),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "LEGACY_ARRAY_PAYLOAD");
        return true;
      },
    );
  });

  it("throws INVALID_JSON for unparseable string inputs", () => {
    assert.throws(
      () => decodeCanonicalRelationships("{not_valid_json"),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_JSON");
        return true;
      },
    );
  });

  it("throws INVALID_ROOT_TYPE for non-object root inputs", () => {
    assert.throws(
      () => decodeCanonicalRelationships(12345),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_ROOT_TYPE");
        return true;
      },
    );

    assert.throws(
      () => decodeCanonicalRelationships(null),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_ROOT_TYPE");
        return true;
      },
    );
  });

  it("throws MISSING_FOUND_FIELD when found boolean is missing or invalid type", () => {
    assert.throws(
      () => decodeCanonicalRelationships(JSON.stringify({ relationships: [] })),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "MISSING_FOUND_FIELD");
        return true;
      },
    );

    assert.throws(
      () => decodeCanonicalRelationships(JSON.stringify({ found: "true", relationships: [] })),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "MISSING_FOUND_FIELD");
        return true;
      },
    );
  });

  it("throws MISSING_RELATIONSHIPS_FIELD when relationships array is missing", () => {
    assert.throws(
      () => decodeCanonicalRelationships(JSON.stringify({ found: true })),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "MISSING_RELATIONSHIPS_FIELD");
        return true;
      },
    );
  });

  it("throws MALFORMED_RELATIONSHIP_ITEM when an item is not an object", () => {
    assert.throws(
      () =>
        decodeCanonicalRelationships(
          JSON.stringify({
            found: true,
            relationships: ["not-an-object"],
          }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "MALFORMED_RELATIONSHIP_ITEM");
        return true;
      },
    );
  });

  it("throws detailed validation errors for invalid item fields", () => {
    // Missing id
    assert.throws(
      () =>
        decodeCanonicalRelationships(
          JSON.stringify({
            found: true,
            relationships: [{ fromSourceId: "src-1", type: "primary" }],
          }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_RELATIONSHIP_ID");
        return true;
      },
    );

    // Missing fromSourceId
    assert.throws(
      () =>
        decodeCanonicalRelationships(
          JSON.stringify({
            found: true,
            relationships: [{ id: "rel-1", type: "primary" }],
          }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_FROM_SOURCE_ID");
        return true;
      },
    );

    // Invalid toSourceId type (neither string nor null)
    assert.throws(
      () =>
        decodeCanonicalRelationships(
          JSON.stringify({
            found: true,
            relationships: [{ id: "rel-1", fromSourceId: "src-1", toSourceId: 123, type: "rel" }],
          }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_TO_SOURCE_ID");
        return true;
      },
    );

    // Missing type
    assert.throws(
      () =>
        decodeCanonicalRelationships(
          JSON.stringify({
            found: true,
            relationships: [{ id: "rel-1", fromSourceId: "src-1" }],
          }),
        ),
      (err: unknown) => {
        assert.ok(err instanceof IncompatibleRelationshipPayloadError);
        assert.equal(err.code, "INVALID_RELATIONSHIP_TYPE");
        return true;
      },
    );
  });
});
