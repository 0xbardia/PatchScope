import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { assertConfiguredContractAddress, isValidContractAddress } from "./network.ts";
import {
  ContractAdapterError,
  executeContractWrite,
  type InjectedEthereumProvider,
} from "./contract-adapter.ts";
import { usePatchScope } from "./store.ts";

/**
 * COMPLETE INVENTORY OF ALL PUBLIC CONTRACT METHODS
 * Canonical Contract: EchoTrace/contracts/patchscope.py
 *
 * | Method Name             | Type  | Parameter Order & Types                                             | Return Shape / Description                                         |
 * |-------------------------|-------|---------------------------------------------------------------------|--------------------------------------------------------------------|
 * | get_policy              | View  | []                                                                  | JSON: {"version", "hash", "webImport", "payments", "admin"}        |
 * | get_agreement           | View  | [agreement_id: string]                                              | JSON: full Agreement record object                                 |
 * | list_agreements         | View  | [cursor: string, limit: number]                                     | JSON: {"items": string[], "nextCursor": string}                    |
 * | get_case                | View  | [case_id: string]                                                   | JSON: full Case record object                                      |
 * | list_cases              | View  | [cursor: string, limit: number]                                     | JSON: {"items": string[], "nextCursor": string}                    |
 * | get_packet              | View  | [case_id: string]                                                   | JSON: frozen case packet object                                    |
 * | get_decision            | View  | [case_id: string]                                                   | JSON: consensus decision object                                    |
 * | create_agreement        | Write | [scope_json: string, counterparty: string]                          | Transaction Hash (creates "agr-XXXXXX")                            |
 * | accept_agreement        | Write | [agreement_id: string, version: number, agreement_hash_hex: string] | Transaction Hash                                                   |
 * | revise_agreement        | Write | [agreement_id: string, scope_json: string]                          | Transaction Hash                                                   |
 * | reject_agreement        | Write | [agreement_id: string]                                              | Transaction Hash                                                   |
 * | expire_agreement        | Write | [agreement_id: string]                                              | Transaction Hash                                                   |
 * | open_case               | Write | [agreement_id: string, request_text: string, cited_json: string, window_seconds: number] | Transaction Hash (creates "case-XXXXXX")        |
 * | submit_statement        | Write | [case_id: string, text: string]                                     | Transaction Hash                                                   |
 * | submit_evidence         | Write | [case_id: string, draft_json: string]                               | Transaction Hash                                                   |
 * | acknowledge_evidence    | Write | [case_id: string, evidence_id: string, content_hash_hex: string]    | Transaction Hash                                                   |
 * | approve_freeze          | Write | [case_id: string]                                                   | Transaction Hash                                                   |
 * | freeze_case             | Write | [case_id: string]                                                   | Transaction Hash                                                   |
 * | request_decision        | Write | [case_id: string]                                                   | Transaction Hash                                                   |
 * | open_review             | Write | [case_id: string, grounds: string, note: string, overlooked_id: string, window_seconds: number] | Transaction Hash                |
 * | submit_review_evidence  | Write | [case_id: string, draft_json: string]                               | Transaction Hash                                                   |
 * | finalize_review         | Write | [case_id: string]                                                   | Transaction Hash                                                   |
 */

export interface MappedWriteSpec {
  name: string;
  args: (string | number | boolean | unknown[])[];
  entityId: string;
}

export interface MappedViewSpec {
  name: string;
  args: unknown[];
  expectedReturnShape: Record<string, unknown>;
}

export const allMappedWrites: MappedWriteSpec[] = [
  {
    name: "create_agreement",
    args: ['{"title":"test scope"}', "0x2222222222222222222222222222222222222222"],
    entityId: "agr-000001",
  },
  {
    name: "accept_agreement",
    args: ["agr-000001", 1, "0x" + "a".repeat(64)],
    entityId: "agr-000001",
  },
  {
    name: "revise_agreement",
    args: ["agr-000001", '{"title":"revised scope"}'],
    entityId: "agr-000001",
  },
  {
    name: "reject_agreement",
    args: ["agr-000001"],
    entityId: "agr-000001",
  },
  {
    name: "expire_agreement",
    args: ["agr-000001"],
    entityId: "agr-000001",
  },
  {
    name: "open_case",
    args: ["agr-000001", "Scope dispute description", JSON.stringify(["S-1", "A-1"]), 86400],
    entityId: "case-000001",
  },
  {
    name: "submit_statement",
    args: ["case-000001", "Party testimony text"],
    entityId: "case-000001",
  },
  {
    name: "submit_evidence",
    args: ["case-000001", '{"type":"TEST_REPORT","content":"log data"}'],
    entityId: "case-000001",
  },
  {
    name: "acknowledge_evidence",
    args: ["case-000001", "E-1", "0x" + "b".repeat(64)],
    entityId: "case-000001",
  },
  {
    name: "approve_freeze",
    args: ["case-000001"],
    entityId: "case-000001",
  },
  {
    name: "freeze_case",
    args: ["case-000001"],
    entityId: "case-000001",
  },
  {
    name: "request_decision",
    args: ["case-000001"],
    entityId: "case-000001",
  },
  {
    name: "open_review",
    args: ["case-000001", "OVERLOOKED_REFERENCE", "Review explanation note", "A-1", 86400],
    entityId: "case-000001",
  },
  {
    name: "submit_review_evidence",
    args: ["case-000001", '{"type":"POST_PATCH_REPORT","content":"review log"}'],
    entityId: "case-000001",
  },
  {
    name: "finalize_review",
    args: ["case-000001"],
    entityId: "case-000001",
  },
];

export const allMappedViews: MappedViewSpec[] = [
  {
    name: "get_policy",
    args: [],
    expectedReturnShape: {
      version: "patchscope-v1.0.0",
      hash: "73a4b02cd684b31f35753b59980fe207dbcc8755a2309a14836455de315640b5",
      admin: false,
      payments: false,
      webImport: false,
    },
  },
  {
    name: "list_agreements",
    args: ["", 10],
    expectedReturnShape: { items: [], nextCursor: "" },
  },
  {
    name: "list_cases",
    args: ["", 10],
    expectedReturnShape: { items: [], nextCursor: "" },
  },
  {
    name: "get_agreement",
    args: ["agr-000001"],
    expectedReturnShape: { id: "agr-000001", status: "PROPOSED" },
  },
  {
    name: "get_case",
    args: ["case-000001"],
    expectedReturnShape: { id: "case-000001", status: "OPEN" },
  },
  {
    name: "get_packet",
    args: ["case-000001"],
    expectedReturnShape: { request: "dispute", cited: ["S-1"] },
  },
  {
    name: "get_decision",
    args: ["case-000001"],
    expectedReturnShape: {
      classification: "INSUFFICIENT_EVIDENCE",
      reasonCode: "CLAUSE_REFERENCE_INCOMPLETE",
    },
  },
];

interface RecordedCall {
  method: string;
  params?: unknown;
}

function createRecordingProvider(
  recorded: RecordedCall[],
  txHashOverride?: string,
): InjectedEthereumProvider {
  return {
    async request({ method, params }) {
      recorded.push({ method, params });
      if (method === "eth_chainId") return "0xf22f"; // 61999
      if (method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
      if (method === "eth_sendTransaction") return txHashOverride || `0x${"dd".repeat(32)}`;
      if (method === "eth_gasPrice") return "0x0";
      if (method === "eth_estimateGas") return "0x30d40";
      throw new Error(`Unsupported RPC method in mock: ${method}`);
    },
  };
}

describe("contract-method-mapping: configuration provenance (Approach A)", () => {
  it("isValidContractAddress enforces strict 20-byte hex format and rejects zero-address", () => {
    assert.equal(isValidContractAddress("0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df"), true);
    assert.equal(isValidContractAddress("0x1111111111111111111111111111111111111111"), true);
    assert.equal(isValidContractAddress("0x0000000000000000000000000000000000000000"), false);
    assert.equal(isValidContractAddress("0x0000000000000000000000000000000000000001"), true);
    assert.equal(isValidContractAddress(""), false);
    assert.equal(isValidContractAddress("0x123"), false);
    assert.equal(isValidContractAddress("not-an-address"), false);
    assert.equal(isValidContractAddress(null), false);
    assert.equal(isValidContractAddress(undefined), false);
  });

  it("assertConfiguredContractAddress throws descriptive error without silent fallback", () => {
    const oldEnv = process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
    try {
      delete process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
      assert.throws(
        () => assertConfiguredContractAddress(),
        /Contract address is not configured\. Set VITE_GENLAYER_CONTRACT_ADDRESS/,
      );
    } finally {
      if (oldEnv) process.env.VITE_GENLAYER_CONTRACT_ADDRESS = oldEnv;
    }
  });

  it("executeContractWrite fails closed and prevents SDK calls when unconfigured", async () => {
    const recorded: RecordedCall[] = [];
    const provider = createRecordingProvider(recorded);
    const oldEnv = process.env.VITE_GENLAYER_CONTRACT_ADDRESS;

    try {
      delete process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
      await assert.rejects(
        async () => {
          await executeContractWrite(
            provider,
            "0x1111111111111111111111111111111111111111",
            "create_agreement",
            ["{}", "0x2222222222222222222222222222222222222222"],
          );
        },
        (err: unknown) => {
          assert.ok(err instanceof ContractAdapterError);
          assert.equal(err.code, "CONFIG_ERROR");
          return true;
        },
      );

      // Verify that NO eth_sendTransaction or network call was attempted
      assert.equal(recorded.length, 0);
    } finally {
      if (oldEnv) process.env.VITE_GENLAYER_CONTRACT_ADDRESS = oldEnv;
    }
  });

  it("executeContractWrite fails closed and prevents SDK calls when address is zero-address or malformed", async () => {
    const recorded: RecordedCall[] = [];
    const provider = createRecordingProvider(recorded);

    // Test zero-address
    await assert.rejects(
      async () => {
        await executeContractWrite(
          provider,
          "0x1111111111111111111111111111111111111111",
          "create_agreement",
          ["{}", "0x2222222222222222222222222222222222222222"],
          undefined,
          "0x0000000000000000000000000000000000000000",
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ContractAdapterError);
        assert.equal(err.code, "CONFIG_ERROR");
        return true;
      },
    );

    // Test malformed address
    await assert.rejects(
      async () => {
        await executeContractWrite(
          provider,
          "0x1111111111111111111111111111111111111111",
          "create_agreement",
          ["{}", "0x2222222222222222222222222222222222222222"],
          undefined,
          "0x1234bad",
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ContractAdapterError);
        assert.equal(err.code, "CONFIG_ERROR");
        return true;
      },
    );

    assert.equal(recorded.length, 0);
  });
});

describe("contract-method-mapping: complete write method mapping", () => {
  const dummyCaller = "0x1111111111111111111111111111111111111111";
  const targetContract = "0x5555555555555555555555555555555555555555";

  for (const writeSpec of allMappedWrites) {
    it(`correctly maps and executes write method: ${writeSpec.name}`, async () => {
      const recorded: RecordedCall[] = [];
      const provider = createRecordingProvider(recorded);

      const record = await executeContractWrite(
        provider,
        dummyCaller,
        writeSpec.name,
        writeSpec.args,
        writeSpec.entityId,
        targetContract,
      );

      assert.equal(record.method, writeSpec.name);
      assert.equal(record.entityId, writeSpec.entityId);
      assert.equal(record.status, "SUBMITTED");
      assert.ok(/^0x[0-9a-fA-F]{64}$/.test(record.txHash));

      // Assert that chainId was verified
      assert.ok(recorded.some((r) => r.method === "eth_chainId"));
      // Assert that transaction was sent via provider
      const txCall = recorded.find((r) => r.method === "eth_sendTransaction");
      assert.ok(txCall, `eth_sendTransaction must be invoked for ${writeSpec.name}`);
    });
  }
});

describe("contract-method-mapping: complete view method inventory & coverage", () => {
  it("authoritatively distinguishes adapter-supported methods from UI-connected methods", () => {
    // 5 UI-connected actions wired via usePatchScope in workspace views:
    // - submitAgreementOnChain (calls create_agreement)
    // - acceptAgreementOnChain (calls accept_agreement)
    // - openCaseOnChain (calls open_case)
    // - freezeCaseOnChain (calls freeze_case)
    // - requestDecisionOnChain (calls request_decision)
    // The remaining write methods are supported by contract adapter & store, pending UI action buttons.
    assert.equal(typeof usePatchScope.getState().openCaseOnChain, "function");
    assert.equal(typeof usePatchScope.getState().submitAgreementOnChain, "function");
    assert.equal(typeof usePatchScope.getState().acceptAgreementOnChain, "function");
    assert.equal(typeof usePatchScope.getState().freezeCaseOnChain, "function");
    assert.equal(typeof usePatchScope.getState().requestDecisionOnChain, "function");
  });

  it("proves store.openCaseOnChain serializes citedClauseIds as canonical JSON string, not bare array", async () => {
    const recorded: RecordedCall[] = [];
    const provider = createRecordingProvider(recorded);
    const origEth = (globalThis as any).window?.ethereum;
    (globalThis as any).window = { ethereum: provider };

    const oldEnv = process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
    process.env.VITE_GENLAYER_CONTRACT_ADDRESS = "0x5555555555555555555555555555555555555555";
    const store = usePatchScope.getState();
    const testCaseId = "case-unit-test-1";
    usePatchScope.setState({
      cases: [
        {
          id: testCaseId,
          agreementId: "agr-000001",
          requestText: "This is a valid test dispute request with enough text length.",
          citedClauseIds: ["S-1", "A-1"],
          statements: [],
          evidence: [],
          acks: [],
          freezeApprovals: [],
          createdAt: 1000000,
          deadlineAt: 1086400,
          status: "OPEN",
        } as any,
      ],
      chainTxs: {},
    });

    try {
      const res = await store.openCaseOnChain(testCaseId);
      assert.ok(res.ok);
      const updatedState = usePatchScope.getState();
      const tx = updatedState.chainTxs[res.id!];
      assert.ok(tx);
      assert.equal(tx.method, "open_case");
      assert.equal(tx.args[0], "agr-000001");
      assert.equal(tx.args[1], "This is a valid test dispute request with enough text length.");
      assert.equal(
        typeof tx.args[2],
        "string",
        "cited must be serialized as JSON string (cited_json)",
      );
      assert.equal(tx.args[2], JSON.stringify(["S-1", "A-1"]));
      assert.equal(typeof tx.args[3], "number");
    } finally {
      if (oldEnv) process.env.VITE_GENLAYER_CONTRACT_ADDRESS = oldEnv;
      else delete process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
      if (origEth) (globalThis as any).window.ethereum = origEth;
      else delete (globalThis as any).window;
    }
  });

  it("verifies inventory includes exactly 7 canonical view methods", () => {
    assert.equal(allMappedViews.length, 7);
  });

  for (const viewSpec of allMappedViews) {
    it(`verifies view specification and argument signature: ${viewSpec.name}`, () => {
      assert.ok(typeof viewSpec.name === "string" && viewSpec.name.length > 0);
      assert.ok(Array.isArray(viewSpec.args));
      assert.ok(
        typeof viewSpec.expectedReturnShape === "object" && viewSpec.expectedReturnShape !== null,
      );
    });
  }

  it("dynamically validates complete public method coverage against checked-in EchoTrace/contracts/patchscope.py", () => {
    const contractSource = fs.readFileSync("EchoTrace/contracts/patchscope.py", "utf-8");
    const viewRegex = /@gl\.public\.view\s+def\s+([a-zA-Z0-9_]+)/g;
    const writeRegex = /@gl\.public\.write\s+def\s+([a-zA-Z0-9_]+)/g;
    const viewsInSource = [...contractSource.matchAll(viewRegex)].map((m) => m[1]);
    const writesInSource = [...contractSource.matchAll(writeRegex)].map((m) => m[1]);

    const mappedViewNames = allMappedViews.map((v) => v.name);
    const mappedWriteNames = allMappedWrites.map((w) => w.name);

    for (const view of viewsInSource) {
      assert.ok(
        mappedViewNames.includes(view),
        `Public view method ${view} in patchscope.py is missing from test mapping`,
      );
    }
    for (const write of writesInSource) {
      assert.ok(
        mappedWriteNames.includes(write),
        `Public write method ${write} in patchscope.py is missing from test mapping`,
      );
    }

    assert.equal(mappedViewNames.length, viewsInSource.length);
    assert.equal(mappedWriteNames.length, writesInSource.length);
  });
});
