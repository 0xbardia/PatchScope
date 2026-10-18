import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertStudionetChain,
  ContractAdapterError,
  executeContractWrite,
  pollTransactionStatus,
  type InjectedEthereumProvider,
} from "./contract-adapter.ts";
import { usePatchScope } from "./store.ts";

function createMockProvider(
  overrides: Record<string, (params?: any) => Promise<any> | any> = {},
): InjectedEthereumProvider {
  return {
    async request({ method, params }) {
      if (overrides[method]) {
        return overrides[method](params);
      }
      if (method === "eth_chainId") return "0xf22f";
      if (method === "eth_accounts") return ["0x1111111111111111111111111111111111111111"];
      if (method === "eth_sendTransaction") return `0x${"aa".repeat(32)}`;
      if (method === "eth_gasPrice") return "0x0";
      if (method === "eth_estimateGas") return "0x30d40";
      throw new Error(`Unsupported method ${method}`);
    },
  };
}

describe("contract-adapter: network and chain assertions", () => {
  it("assertStudionetChain passes when wallet is on Studionet (61999 / 0xf22f)", async () => {
    const provider = createMockProvider();
    await assert.doesNotReject(async () => {
      await assertStudionetChain(provider);
    });
  });

  it("assertStudionetChain requests network switch when on wrong chain and handles rejection", async () => {
    const provider = createMockProvider({
      eth_chainId: () => "0x1", // Ethereum Mainnet
      wallet_switchEthereumChain: () => {
        throw { code: 4001, message: "User rejected the request." };
      },
    });

    await assert.rejects(
      async () => {
        await assertStudionetChain(provider);
      },
      (err: unknown) => {
        assert.ok(err instanceof ContractAdapterError);
        assert.equal(err.code, "WRONG_NETWORK");
        assert.ok(err.message.includes("Chain ID 61999"));
        return true;
      },
    );
  });
});

describe("contract-adapter: write submission and error handling", () => {
  const dummyAccount = "0x1111111111111111111111111111111111111111";
  const dummyContract = "0x5555555555555555555555555555555555555555";

  it("throws CONFIG_ERROR when contract address is missing", async () => {
    const provider = createMockProvider();
    const oldEnv = process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
    try {
      delete process.env.VITE_GENLAYER_CONTRACT_ADDRESS;
      await assert.rejects(
        async () => {
          await executeContractWrite(provider, dummyAccount, "create_agreement", [
            '{"title":"test"}',
            "0x2222222222222222222222222222222222222222",
          ]);
        },
        (err: unknown) => {
          assert.ok(err instanceof ContractAdapterError);
          assert.equal(err.code, "CONFIG_ERROR");
          return true;
        },
      );
    } finally {
      if (oldEnv) process.env.VITE_GENLAYER_CONTRACT_ADDRESS = oldEnv;
    }
  });

  it("submits contract write and returns tracking record with real hash format", async () => {
    const expectedHash = `0x${"ab".repeat(32)}`;
    const provider = createMockProvider({
      eth_sendTransaction: () => expectedHash,
    });

    const record = await executeContractWrite(
      provider,
      dummyAccount,
      "create_agreement",
      ['{"title":"test"}', "0x2222222222222222222222222222222222222222"],
      "agr-test-1",
      dummyContract,
    );

    assert.equal(record.txHash, expectedHash);
    assert.equal(record.status, "SUBMITTED");
    assert.equal(record.method, "create_agreement");
    assert.equal(record.entityId, "agr-test-1");
  });

  it("catches user wallet rejection without corrupting state", async () => {
    const provider = createMockProvider({
      eth_sendTransaction: () => {
        throw new Error("User rejected the transaction. code: 4001");
      },
    });

    await assert.rejects(
      async () => {
        await executeContractWrite(
          provider,
          dummyAccount,
          "create_agreement",
          ["{}", "0x2222222222222222222222222222222222222222"],
          undefined,
          dummyContract,
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ContractAdapterError);
        assert.equal(err.code, "USER_REJECTED");
        assert.equal(err.message, "Transaction was rejected in the wallet.");
        return true;
      },
    );
  });

  it("catches safety guard blocked broadcast", async () => {
    const provider = createMockProvider({
      eth_sendTransaction: () => {
        throw new Error(
          "BLOCKED_BY_SAFETY_GUARD: Automated scripts are forbidden from broadcasting transactions.",
        );
      },
    });

    await assert.rejects(
      async () => {
        await executeContractWrite(
          provider,
          dummyAccount,
          "create_agreement",
          ["{}", "0x2222222222222222222222222222222222222222"],
          undefined,
          dummyContract,
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ContractAdapterError);
        assert.equal(err.code, "SAFETY_GUARD_BLOCKED");
        return true;
      },
    );
  });
});

describe("contract-adapter: consensus status polling & timeouts", () => {
  it("never infers success on immediate timeout", async () => {
    // Polling a non-existent hash with maxAttempts=1 should return TIMEOUT, never ACCEPTED
    const res = await pollTransactionStatus(`0x${"00".repeat(32)}`, 1, 50);
    assert.equal(res.status, "TIMEOUT");
    assert.ok(res.error?.includes("did not reach consensus within timeout"));
  });
});

describe("contract-adapter: store integration & persistence recovery", () => {
  it("tracks chain transaction records in persistent store", () => {
    const store = usePatchScope.getState();
    const testRecord = {
      txHash: `0x${"33".repeat(32)}`,
      method: "create_agreement",
      args: ["{}"],
      status: "SUBMITTED" as const,
      submittedAt: Date.now(),
      entityId: "agr-recovery-test",
    };

    store.updateChainTx(testRecord);
    const updated = usePatchScope.getState().chainTxs[testRecord.txHash];
    assert.ok(updated);
    assert.equal(updated.txHash, testRecord.txHash);
    assert.equal(updated.status, "SUBMITTED");
  });
});
