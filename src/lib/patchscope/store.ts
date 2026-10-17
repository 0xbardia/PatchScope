import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_CLIENT, DEMO_DEVELOPER } from "./example.ts";
import {
  PolicyError,
  acceptAgreement,
  acknowledgeEvidence,
  addEvidence,
  addStatement,
  approveFreeze,
  assertChangeOrderAllowed,
  canonicalScope,
  currentVersion,
  decideCase,
  expireAgreement,
  finalizeReview,
  freezeCase,
  openCase,
  openReview,
  proposeAgreement,
  rejectAgreement,
  reviseAgreement,
  type Agreement,
  type CaseRecord,
  type Evidence,
  type ReviewGrounds,
  type ScopeCard,
} from "./policy.ts";
import {
  executeContractWrite,
  getInjectedProvider,
  pollTransactionStatus,
  type ChainTxRecord,
  ContractAdapterError,
} from "./contract-adapter.ts";

export interface Persona {
  role: "developer" | "client";
  address: string;
  label: string;
  kind: "demo" | "wallet";
}

export interface Activity {
  id: string;
  at: number;
  actor: string;
  action: string;
  summary: string;
}

export interface TeamState {
  name: string;
  owner: string;
  members: string[];
}

export interface DraftState {
  revision: number;
  developer: string;
  client: string;
  card: ScopeCard;
  savedAt: number;
}

export type ActionResult = { ok: true; id?: string } | { ok: false; code: string; message: string };

interface PatchState {
  activeRole: "developer" | "client";
  personas: { developer: Persona; client: Persona };
  team: TeamState;
  prefs: { inAppActivity: boolean; inAppDecisions: boolean };
  agreements: Agreement[];
  cases: CaseRecord[];
  activity: Activity[];
  drafts: Record<string, DraftState>;
  chainTxs: Record<string, ChainTxRecord>;
  setRole: (role: "developer" | "client") => void;
  adoptWallet: (role: "developer" | "client", address: string) => void;
  restoreDemo: (role: "developer" | "client") => void;
  actor: () => string;
  saveDraft: (id: string, draft: Omit<DraftState, "revision" | "savedAt">, expectedRevision: number) => ActionResult;
  propose: (card: ScopeCard, developer: string, client: string) => Promise<ActionResult>;
  submitAgreementOnChain: (agreementId: string) => Promise<ActionResult>;
  acceptAgreementOnChain: (agreementId: string) => Promise<ActionResult>;
  openCaseOnChain: (caseId: string) => Promise<ActionResult>;
  freezeCaseOnChain: (caseId: string) => Promise<ActionResult>;
  requestDecisionOnChain: (caseId: string) => Promise<ActionResult>;
  updateChainTx: (txRecord: ChainTxRecord) => void;
  accept: (id: string, version: number, hash: string) => ActionResult;
  reject: (id: string) => ActionResult;
  revise: (id: string, card: ScopeCard) => Promise<ActionResult>;
  expire: (id: string) => ActionResult;
  createCase: (agreementId: string, requestText: string, cited: string[], windowMs: number) => ActionResult;
  statement: (caseId: string, text: string) => ActionResult;
  evidence: (
    caseId: string,
    draft: Omit<Evidence, "id" | "submitter" | "contentHash" | "addedDuringReview" | "provenance">,
  ) => Promise<ActionResult>;
  acknowledge: (caseId: string, evidenceId: string, contentHash: string) => ActionResult;
  approveFreeze: (caseId: string) => Promise<ActionResult>;
  freeze: (caseId: string, allowDeadline: boolean) => Promise<ActionResult>;
  decide: (caseId: string) => ActionResult;
  beginReview: (
    caseId: string,
    grounds: ReviewGrounds,
    note: string,
    overlookedClauseId: string,
    windowMs: number,
  ) => ActionResult;
  reviewEvidence: (
    caseId: string,
    draft: Omit<Evidence, "id" | "submitter" | "contentHash" | "addedDuringReview" | "provenance">,
  ) => Promise<ActionResult>;
  finishReview: (caseId: string) => ActionResult;
  changeOrder: (caseId: string, card: ScopeCard, developer: string, client: string) => Promise<ActionResult>;
  invite: (address: string) => ActionResult;
  removeMember: (address: string) => ActionResult;
  setPrefs: (prefs: PatchState["prefs"]) => void;
  renameTeam: (name: string) => ActionResult;
  resetWorkspace: () => void;
}

function nid(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${hex}`;
}

function resultError(error: unknown): ActionResult {
  if (error instanceof PolicyError) return { ok: false, code: error.code, message: error.message };
  return { ok: false, code: "UNEXPECTED", message: "That action did not complete. No partial record was kept." };
}

function log(summary: string, actor: string, action: string): Activity {
  return { id: nid("act"), at: Date.now(), actor, action, summary };
}

const demoPersonas = {
  developer: {
    role: "developer" as const,
    address: DEMO_DEVELOPER,
    label: "Demo developer",
    kind: "demo" as const,
  },
  client: {
    role: "client" as const,
    address: DEMO_CLIENT,
    label: "Demo client",
    kind: "demo" as const,
  },
};

export const usePatchScope = create<PatchState>()(
  persist(
    (set, get) => ({
      activeRole: "developer",
      personas: demoPersonas,
      team: { name: "Local workspace", owner: DEMO_DEVELOPER, members: [] },
      prefs: { inAppActivity: true, inAppDecisions: true },
      agreements: [],
      cases: [],
      activity: [],
      drafts: {},
      chainTxs: {},
      setRole: (role) => set({ activeRole: role }),
      adoptWallet: (role, address) => {
        const normalized = address.toLowerCase();
        set((state) => ({
          personas: {
            ...state.personas,
            [role]: {
              role,
              address: normalized,
              label: "Connected wallet",
              kind: "wallet",
            },
          },
        }));
      },
      restoreDemo: (role) =>
        set((state) => ({
          personas: { ...state.personas, [role]: demoPersonas[role] },
        })),
      actor: () => get().personas[get().activeRole].address,
      saveDraft: (id, draft, expectedRevision) => {
        const current = get().drafts[id];
        const revision = current?.revision ?? 0;
        if (revision !== expectedRevision) {
          return {
            ok: false,
            code: "DRAFT_CONFLICT",
            message: "This draft changed in another tab. Reload it, or overwrite explicitly.",
          };
        }
        set((state) => ({
          drafts: {
            ...state.drafts,
            [id]: { ...draft, revision: revision + 1, savedAt: Date.now() },
          },
        }));
        return { ok: true };
      },
      propose: async (card, developer, client) => {
        try {
          const actor = get().actor();
          const id = nid("agr");
          const agreement = await proposeAgreement({
            id,
            developer,
            client,
            proposer: actor,
            card,
            now: Date.now(),
          });
          set((state) => ({
            agreements: [...state.agreements, agreement],
            activity: [log(`Proposed ${agreement.id}`, actor, "propose"), ...state.activity].slice(0, 200),
          }));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      submitAgreementOnChain: async (agreementId: string) => {
        const provider = getInjectedProvider();
        if (!provider) {
          return { ok: false, code: "NO_WALLET", message: "No injected Web3 wallet found. Please install MetaMask or another EIP-1193 wallet." };
        }
        const agreement = requireAgreement(get().agreements, agreementId);
        const version = currentVersion(agreement);
        const actor = get().actor();
        const counterparty = agreement.developer.toLowerCase() === actor.toLowerCase() ? agreement.client : agreement.developer;
        const scopeJson = canonicalScope(version.card);

        try {
          const txRecord = await executeContractWrite(
            provider,
            actor,
            "create_agreement",
            [scopeJson, counterparty],
            agreementId
          );
          set((state) => ({
            chainTxs: { ...state.chainTxs, [txRecord.txHash]: txRecord },
            agreements: state.agreements.map((a) =>
              a.id === agreementId ? { ...a, onChainTxHash: txRecord.txHash, onChainStatus: "SUBMITTED" } : a
            ),
            activity: [log(`Submitted agreement ${agreementId} on-chain (tx: ${txRecord.txHash})`, actor, "chain_submit"), ...state.activity].slice(0, 200),
          }));

          void pollTransactionStatus(txRecord.txHash, 30, 3000, (status) => {
            set((state) => ({
              chainTxs: {
                ...state.chainTxs,
                [txRecord.txHash]: { ...state.chainTxs[txRecord.txHash], status },
              },
            }));
          }).then((res) => {
            set((state) => ({
              chainTxs: {
                ...state.chainTxs,
                [txRecord.txHash]: {
                  ...state.chainTxs[txRecord.txHash],
                  status: res.status,
                  confirmedAt: res.confirmedAt,
                  error: res.error,
                  consensusResult: res.consensusResult,
                  validatorVotes: res.validatorVotes,
                },
              },
              agreements: state.agreements.map((a) =>
                a.id === agreementId ? { ...a, onChainStatus: res.status === "FINALIZED" || res.status === "ACCEPTED" ? "CONFIRMED" : "REVERTED" } : a
              ),
              activity: [log(`On-chain agreement ${agreementId} status: ${res.status}`, actor, "chain_confirmed"), ...state.activity].slice(0, 200),
            }));
          });

          return { ok: true, id: txRecord.txHash };
        } catch (err: unknown) {
          const msg = err instanceof ContractAdapterError ? err.message : String(err);
          const code = err instanceof ContractAdapterError ? err.code : "CHAIN_ERROR";
          return { ok: false, code, message: msg };
        }
      },
      acceptAgreementOnChain: async (agreementId: string) => {
        const provider = getInjectedProvider();
        if (!provider) {
          return { ok: false, code: "NO_WALLET", message: "No injected Web3 wallet found. Please install MetaMask or another EIP-1193 wallet." };
        }
        const agreement = requireAgreement(get().agreements, agreementId);
        const version = currentVersion(agreement);
        const actor = get().actor();

        try {
          const txRecord = await executeContractWrite(
            provider,
            actor,
            "accept_agreement",
            [agreementId, version.version, version.hash],
            agreementId
          );
          set((state) => ({
            chainTxs: { ...state.chainTxs, [txRecord.txHash]: txRecord },
            agreements: state.agreements.map((a) =>
              a.id === agreementId ? { ...a, onChainTxHash: txRecord.txHash, onChainStatus: "SUBMITTED" } : a
            ),
            activity: [log(`Accepted agreement ${agreementId} on-chain (tx: ${txRecord.txHash})`, actor, "chain_accept"), ...state.activity].slice(0, 200),
          }));

          void pollTransactionStatus(txRecord.txHash, 30, 3000, (status) => {
            set((state) => ({
              chainTxs: {
                ...state.chainTxs,
                [txRecord.txHash]: { ...state.chainTxs[txRecord.txHash], status },
              },
            }));
          }).then((res) => {
            set((state) => ({
              chainTxs: {
                ...state.chainTxs,
                [txRecord.txHash]: {
                  ...state.chainTxs[txRecord.txHash],
                  status: res.status,
                  confirmedAt: res.confirmedAt,
                  error: res.error,
                  consensusResult: res.consensusResult,
                  validatorVotes: res.validatorVotes,
                },
              },
              agreements: state.agreements.map((a) =>
                a.id === agreementId ? { ...a, onChainStatus: res.status === "FINALIZED" || res.status === "ACCEPTED" ? "CONFIRMED" : "REVERTED" } : a
              ),
            }));
          });

          return { ok: true, id: txRecord.txHash };
        } catch (err: unknown) {
          const msg = err instanceof ContractAdapterError ? err.message : String(err);
          const code = err instanceof ContractAdapterError ? err.code : "CHAIN_ERROR";
          return { ok: false, code, message: msg };
        }
      },
      openCaseOnChain: async (caseId: string) => {
        const provider = getInjectedProvider();
        if (!provider) {
          return { ok: false, code: "NO_WALLET", message: "No injected Web3 wallet found. Please install MetaMask or another EIP-1193 wallet." };
        }
        const record = get().cases.find((c) => c.id === caseId);
        if (!record) return { ok: false, code: "NOT_FOUND", message: "Case not found" };
        const actor = get().actor();
        const windowSeconds = Math.max(60, Math.floor((record.deadlineAt - record.createdAt) / 1000));
        const citedJson = JSON.stringify(record.citedClauseIds);

        try {
          const txRecord = await executeContractWrite(
            provider,
            actor,
            "open_case",
            [record.agreementId, record.requestText, citedJson, windowSeconds],
            caseId
          );
          set((state) => ({
            chainTxs: { ...state.chainTxs, [txRecord.txHash]: txRecord },
            cases: state.cases.map((c) =>
              c.id === caseId ? { ...c, onChainTxHash: txRecord.txHash, onChainStatus: "SUBMITTED" } : c
            ),
            activity: [log(`Opened case ${caseId} on-chain (tx: ${txRecord.txHash})`, actor, "chain_open_case"), ...state.activity].slice(0, 200),
          }));

          void pollTransactionStatus(txRecord.txHash, 30, 3000).then((res) => {
            set((state) => ({
              chainTxs: {
                ...state.chainTxs,
                [txRecord.txHash]: {
                  ...state.chainTxs[txRecord.txHash],
                  status: res.status,
                  confirmedAt: res.confirmedAt,
                  error: res.error,
                },
              },
              cases: state.cases.map((c) =>
                c.id === caseId ? { ...c, onChainStatus: res.status === "FINALIZED" || res.status === "ACCEPTED" ? "CONFIRMED" : "REVERTED" } : c
              ),
            }));
          });

          return { ok: true, id: txRecord.txHash };
        } catch (err: unknown) {
          const msg = err instanceof ContractAdapterError ? err.message : String(err);
          const code = err instanceof ContractAdapterError ? err.code : "CHAIN_ERROR";
          return { ok: false, code, message: msg };
        }
      },
      freezeCaseOnChain: async (caseId: string) => {
        const provider = getInjectedProvider();
        if (!provider) {
          return { ok: false, code: "NO_WALLET", message: "No injected Web3 wallet found." };
        }
        const actor = get().actor();

        try {
          const txRecord = await executeContractWrite(provider, actor, "freeze_case", [caseId], caseId);
          set((state) => ({
            chainTxs: { ...state.chainTxs, [txRecord.txHash]: txRecord },
          }));
          return { ok: true, id: txRecord.txHash };
        } catch (err: unknown) {
          const msg = err instanceof ContractAdapterError ? err.message : String(err);
          const code = err instanceof ContractAdapterError ? err.code : "CHAIN_ERROR";
          return { ok: false, code, message: msg };
        }
      },
      requestDecisionOnChain: async (caseId: string) => {
        const provider = getInjectedProvider();
        if (!provider) {
          return { ok: false, code: "NO_WALLET", message: "No injected Web3 wallet found." };
        }
        const actor = get().actor();

        try {
          const txRecord = await executeContractWrite(provider, actor, "request_decision", [caseId], caseId);
          set((state) => ({
            chainTxs: { ...state.chainTxs, [txRecord.txHash]: txRecord },
            cases: state.cases.map((c) => (c.id === caseId ? { ...c, decisionTxHash: txRecord.txHash } : c)),
            activity: [log(`Requested decision for case ${caseId} on-chain (tx: ${txRecord.txHash})`, actor, "chain_decision"), ...state.activity].slice(0, 200),
          }));

          void pollTransactionStatus(txRecord.txHash, 40, 3000).then((res) => {
            set((state) => ({
              chainTxs: {
                ...state.chainTxs,
                [txRecord.txHash]: {
                  ...state.chainTxs[txRecord.txHash],
                  status: res.status,
                  confirmedAt: res.confirmedAt,
                  error: res.error,
                  consensusResult: res.consensusResult,
                  validatorVotes: res.validatorVotes,
                },
              },
            }));
          });

          return { ok: true, id: txRecord.txHash };
        } catch (err: unknown) {
          const msg = err instanceof ContractAdapterError ? err.message : String(err);
          const code = err instanceof ContractAdapterError ? err.code : "CHAIN_ERROR";
          return { ok: false, code, message: msg };
        }
      },
      updateChainTx: (txRecord: ChainTxRecord) => {
        set((state) => ({
          chainTxs: { ...state.chainTxs, [txRecord.txHash]: txRecord },
        }));
      },
      accept: (id, version, hash) => {
        try {
          const actor = get().actor();
          const current = requireAgreement(get().agreements, id);
          const next = acceptAgreement(current, actor, version, hash, Date.now());
          replaceAgreement(set, next, log(`Accepted ${id} version ${version}`, actor, "accept"));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      reject: (id) => {
        try {
          const actor = get().actor();
          const next = rejectAgreement(requireAgreement(get().agreements, id), actor, Date.now());
          replaceAgreement(set, next, log(`Rejected ${id}`, actor, "reject"));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      revise: async (id, card) => {
        try {
          const actor = get().actor();
          const next = await reviseAgreement(requireAgreement(get().agreements, id), actor, card, Date.now());
          replaceAgreement(set, next, log(`Revised ${id}`, actor, "revise"));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      expire: (id) => {
        try {
          const next = expireAgreement(requireAgreement(get().agreements, id), Date.now());
          replaceAgreement(set, next, log(`Expired ${id}`, get().actor(), "expire"));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      createCase: (agreementId, requestText, cited, windowMs) => {
        try {
          const actor = get().actor();
          const agreement = requireAgreement(get().agreements, agreementId);
          const id = nid("case");
          const record = openCase({
            id,
            agreement,
            actor,
            requestText,
            citedClauseIds: cited,
            windowMs,
            now: Date.now(),
          });
          set((state) => ({
            cases: [...state.cases, record],
            activity: [log(`Opened ${id}`, actor, "open-case"), ...state.activity].slice(0, 200),
          }));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      statement: (caseId, text) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = addStatement(record, agreement, actor, text, Date.now());
          replaceCase(set, next, log(`Statement on ${caseId}`, actor, "statement"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      evidence: async (caseId, draft) => mutateEvidence(set, get, caseId, draft, false),
      acknowledge: (caseId, evidenceId, contentHash) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = acknowledgeEvidence(record, agreement, actor, evidenceId, contentHash, Date.now());
          replaceCase(set, next, log(`Acknowledged ${evidenceId}`, actor, "ack"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      approveFreeze: async (caseId) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = await approveFreeze(record, agreement, actor, Date.now());
          replaceCase(set, next, log(`Approved freeze ${caseId}`, actor, "freeze-approval"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      freeze: async (caseId, allowDeadline) => {
        try {
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = await freezeCase(record, agreement, Date.now(), allowDeadline);
          replaceCase(set, next, log(`Froze ${caseId}`, get().actor(), "freeze"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      decide: (caseId) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = decideCase(record, actor, agreement, Date.now());
          replaceCase(set, next, log(`Decision on ${caseId}`, actor, "decide"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      beginReview: (caseId, grounds, note, overlookedClauseId, windowMs) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = openReview({
            record,
            agreement,
            actor,
            grounds,
            note,
            overlookedClauseId,
            windowMs,
            now: Date.now(),
          });
          replaceCase(set, next, log(`Review opened on ${caseId}`, actor, "review"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      reviewEvidence: async (caseId, draft) => mutateEvidence(set, get, caseId, draft, true),
      finishReview: (caseId) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          const agreement = requireAgreement(get().agreements, record.agreementId);
          const next = finalizeReview(record, agreement, actor, Date.now());
          replaceCase(set, next, log(`Review finished on ${caseId}`, actor, "review-finish"));
          return { ok: true, id: caseId };
        } catch (error) {
          return resultError(error);
        }
      },
      changeOrder: async (caseId, card, developer, client) => {
        try {
          const actor = get().actor();
          const record = requireCase(get().cases, caseId);
          assertChangeOrderAllowed(record);
          const prior = requireAgreement(get().agreements, record.agreementId);
          if (prior.developer !== developer.toLowerCase() || prior.client !== client.toLowerCase()) {
            throw new PolicyError(
              "PARTIES_CHANGED",
              "A change order keeps the same two parties. It does not rewrite the old card.",
            );
          }
          const id = nid("agr");
          const agreement = await proposeAgreement({
            id,
            developer,
            client,
            proposer: actor,
            card,
            now: Date.now(),
            priorAgreementId: prior.id,
            sourceCaseId: caseId,
          });
          set((state) => ({
            agreements: [...state.agreements, agreement],
            activity: [log(`Change order ${id} from ${caseId}`, actor, "change-order"), ...state.activity].slice(0, 200),
          }));
          return { ok: true, id };
        } catch (error) {
          return resultError(error);
        }
      },
      invite: (address) => {
        try {
          const owner = get().team.owner;
          if (get().actor() !== owner) {
            return { ok: false, code: "NOT_OWNER", message: "Only the workspace owner can invite." };
          }
          const member = address.trim().toLowerCase();
          if (!/^0x[0-9a-f]{40}$/.test(member)) {
            return { ok: false, code: "BAD_ADDRESS", message: "Enter a 0x address with 40 hex characters." };
          }
          if (member === owner || get().team.members.includes(member)) {
            return { ok: false, code: "ALREADY_MEMBER", message: "That address is already on the team." };
          }
          set((state) => ({
            team: { ...state.team, members: [...state.team.members, member] },
            activity: [log(`Invited ${member}`, owner, "invite"), ...state.activity].slice(0, 200),
          }));
          return { ok: true };
        } catch (error) {
          return resultError(error);
        }
      },
      removeMember: (address) => {
        const owner = get().team.owner;
        if (get().actor() !== owner) {
          return { ok: false, code: "NOT_OWNER", message: "Only the workspace owner can remove a member." };
        }
        const member = address.toLowerCase();
        if (member === owner) {
          return { ok: false, code: "OWNER", message: "The owner stays on the team. This does not delete anyone's session." };
        }
        set((state) => ({
          team: { ...state.team, members: state.team.members.filter((item) => item !== member) },
          activity: [log(`Removed ${member} from this team only`, owner, "remove"), ...state.activity].slice(0, 200),
        }));
        return { ok: true };
      },
      setPrefs: (prefs) => set({ prefs }),
      renameTeam: (name) => {
        const clean = name.trim();
        if (clean.length < 2 || clean.length > 60) {
          return { ok: false, code: "BAD_NAME", message: "Use 2 to 60 characters for the workspace name." };
        }
        if (get().actor() !== get().team.owner) {
          return { ok: false, code: "NOT_OWNER", message: "Only the owner can rename the workspace." };
        }
        set((state) => ({ team: { ...state.team, name: clean } }));
        return { ok: true };
      },
      resetWorkspace: () =>
        set({
          agreements: [],
          cases: [],
          activity: [],
          drafts: {},
          chainTxs: {},
          activeRole: "developer",
          personas: demoPersonas,
          team: { name: "Local workspace", owner: DEMO_DEVELOPER, members: [] },
        }),
    }),
    {
      name: "patchscope.workspace.v1",
      version: 1,
      partialize: (state) => ({
        activeRole: state.activeRole,
        personas: state.personas,
        team: state.team,
        prefs: state.prefs,
        agreements: state.agreements,
        cases: state.cases,
        activity: state.activity,
        drafts: state.drafts,
        chainTxs: state.chainTxs,
      }),
    },
  ),
);

function requireAgreement(list: Agreement[], id: string): Agreement {
  const found = list.find((item) => item.id === id);
  if (!found) throw new PolicyError("MISSING_AGREEMENT", "That agreement is not in this workspace.");
  return found;
}

function requireCase(list: CaseRecord[], id: string): CaseRecord {
  const found = list.find((item) => item.id === id);
  if (!found) throw new PolicyError("MISSING_CASE", "That case is not in this workspace.");
  return found;
}

function replaceAgreement(
  set: (fn: (state: PatchState) => Partial<PatchState>) => void,
  next: Agreement,
  entry: Activity,
) {
  set((state) => ({
    agreements: state.agreements.map((item) => (item.id === next.id ? next : item)),
    activity: state.prefs.inAppActivity ? [entry, ...state.activity].slice(0, 200) : state.activity,
  }));
}

function replaceCase(
  set: (fn: (state: PatchState) => Partial<PatchState>) => void,
  next: CaseRecord,
  entry: Activity,
) {
  set((state) => ({
    cases: state.cases.map((item) => (item.id === next.id ? next : item)),
    activity:
      state.prefs.inAppActivity || (state.prefs.inAppDecisions && entry.action === "decide")
        ? [entry, ...state.activity].slice(0, 200)
        : state.activity,
  }));
}

async function mutateEvidence(
  set: (fn: (state: PatchState) => Partial<PatchState>) => void,
  get: () => PatchState,
  caseId: string,
  draft: Omit<Evidence, "id" | "submitter" | "contentHash" | "addedDuringReview" | "provenance">,
  duringReview: boolean,
): Promise<ActionResult> {
  try {
    const actor = get().actor();
    const record = requireCase(get().cases, caseId);
    const agreement = requireAgreement(get().agreements, record.agreementId);
    const { record: next } = await addEvidence(record, agreement, actor, draft, Date.now(), duringReview);
    replaceCase(set, next, log(`Evidence on ${caseId}`, actor, "evidence"));
    return { ok: true, id: caseId };
  } catch (error) {
    return resultError(error);
  }
}

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (usePatchScope.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return usePatchScope.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
