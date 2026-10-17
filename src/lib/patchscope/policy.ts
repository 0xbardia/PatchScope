/** Deterministic PatchScope v1 policy. Scope classification only. */

export const POLICY_VERSION = "patchscope-v1.0.0";

export const POLICY_DOCUMENT = [
  "patchscope-v1.0.0",
  "classifications:IN_SCOPE,CHANGE_REQUEST,INSUFFICIENT_EVIDENCE",
  "reasons:MATCHES_INCLUDED_AND_ACCEPTANCE,MATCHES_EXCLUDED,CLAUSE_REFERENCE_INCOMPLETE,MIXED_SCOPE,NON_ATOMIC_REQUEST,CAUSATION_NOT_ESTABLISHED,MISSING_ADMISSIBLE_EVIDENCE,ENVIRONMENT_MISMATCH",
  "no-payment",
  "no-admin",
  "web-import:disabled",
  "max-page:50",
  "review:NEW_EVIDENCE,OVERLOOKED_REFERENCE",
  "review-results:UPHELD,REVISED,REVIEW_NOT_ADMISSIBLE",
].join("\n");

/** sha256(POLICY_DOCUMENT). Recomputed in policy.test.ts. */
export const POLICY_HASH =
  "73a4b02cd684b31f35753b59980fe207dbcc8755a2309a14836455de315640b5";

export const PAGE_MAX = 50;
export const PROPOSAL_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const LIMITS = {
  title: 120,
  narrative: 2000,
  clause: 500,
  scenario: 120,
  environment: 300,
  version: 120,
  clauses: 24,
  request: 1500,
  requestMin: 20,
  statement: 2000,
  statements: 12,
  evidence: 4000,
  evidenceCount: 8,
  reviewEvidence: 4,
  packet: 48000,
  cited: 4,
} as const;

export type ClauseKind = "S" | "X" | "A" | "P";
export type AgreementStatus = "DRAFT" | "PROPOSED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type CaseStatus = "OPEN" | "FROZEN" | "DECIDED" | "IN_REVIEW" | "REVIEWED";
export type EvidenceType =
  | "BASELINE_REPORT"
  | "POST_PATCH_REPORT"
  | "TEST_REPORT"
  | "PUBLIC_EXCERPT";
export type Classification = "IN_SCOPE" | "CHANGE_REQUEST" | "INSUFFICIENT_EVIDENCE";
export type ReviewGrounds = "NEW_EVIDENCE" | "OVERLOOKED_REFERENCE";
export type ReviewStatus = "NONE" | "UPHELD" | "REVISED" | "REVIEW_NOT_ADMISSIBLE";

export interface Clause {
  id: string;
  text: string;
  scenario: string;
}

export interface ScopeCard {
  title: string;
  brokenBehavior: string;
  expectedBehavior: string;
  environment: string;
  baselineVersion: string;
  included: Clause[];
  excluded: Clause[];
  acceptance: Clause[];
  protected: Clause[];
}

export interface Decision {
  classification: Classification;
  reasonCode: string;
  clauseRefs: string[];
  evidenceRefs: string[];
  summary: string;
  missingEvidence: string[];
  limitations: string[];
  reviewStatus: ReviewStatus;
}

export class PolicyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PolicyError";
    this.code = code;
  }
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const CLAUSE_ID = /^(S|X|A|P)-[1-9][0-9]{0,3}$/;
const BIDI = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

const SCOPE_KEYS = [
  "acceptance",
  "baselineVersion",
  "brokenBehavior",
  "environment",
  "excluded",
  "expectedBehavior",
  "included",
  "protected",
  "title",
] as const;

const BASE_LIMITATIONS = [
  "This classifies scope only. It is not a finding of legal liability, payment entitlement, code quality, or truthfulness.",
];

export function assertTime(now: number): void {
  if (!Number.isFinite(now) || now < 1_700_000_000_000 || now > 4_102_444_800_000) {
    throw new PolicyError(
      "TRUSTED_TIME_UNAVAILABLE",
      "A trustworthy clock reading is required, so nothing was recorded.",
    );
  }
}

export function normalizeAddress(value: string): string {
  const trimmed = value.trim();
  if (!ADDRESS.test(trimmed)) {
    throw new PolicyError(
      "BAD_ADDRESS",
      "Use a 0x address with exactly 40 hex characters.",
    );
  }
  return trimmed.toLowerCase();
}

export function normalizeText(value: string, max: number, label: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = value.normalize("NFC").replace(BIDI, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!cleaned) throw new PolicyError("EMPTY_FIELD", `${label} is required.`);
  if (cleaned.length > max) {
    throw new PolicyError("TOO_LONG", `${label} must be ${max} characters or fewer.`);
  }
  return cleaned;
}

export function optionalText(value: string, max: number, label: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = value.normalize("NFC").replace(BIDI, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (cleaned.length > max) {
    throw new PolicyError("TOO_LONG", `${label} must be ${max} characters or fewer.`);
  }
  return cleaned;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export function canonicalScope(card: ScopeCard): string {
  const body = {
    acceptance: card.acceptance,
    baselineVersion: card.baselineVersion,
    brokenBehavior: card.brokenBehavior,
    environment: card.environment,
    excluded: card.excluded,
    expectedBehavior: card.expectedBehavior,
    included: card.included,
    protected: card.protected,
    title: card.title,
  };
  return stableStringify(body);
}

export async function agreementHash(card: ScopeCard): Promise<string> {
  return sha256Hex(`patchscope-agreement-v1\n${canonicalScope(card)}`);
}

export function atomicityIssue(text: string): string | null {
  const enumerated = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+[).\]]\s+\S+/.test(line));
  if (enumerated.length >= 3) {
    return "This reads as three or more numbered demands. A case can hold one atomic request.";
  }
  return null;
}

function assertKind(clause: Clause, kind: ClauseKind): void {
  if (!clause.id.startsWith(`${kind}-`)) {
    throw new PolicyError("BAD_CLAUSE_ID", `${clause.id} does not belong in the ${kind} list.`);
  }
}

function normalizeClause(input: Clause, kind: ClauseKind): Clause {
  const id = input.id.trim().toUpperCase();
  if (!CLAUSE_ID.test(id) || !id.startsWith(`${kind}-`)) {
    throw new PolicyError("BAD_CLAUSE_ID", `Clause ids look like ${kind}-1.`);
  }
  const text = normalizeText(input.text, LIMITS.clause, `Clause ${id}`);
  const scenario = optionalText(input.scenario ?? "", LIMITS.scenario, `Scenario for ${id}`);
  if (kind === "P" && !scenario) {
    throw new PolicyError("MISSING_SCENARIO", `Protected clause ${id} needs a scenario id.`);
  }
  const clause = { id, text, scenario };
  assertKind(clause, kind);
  return clause;
}

function normalizeList(list: Clause[], kind: ClauseKind): Clause[] {
  if (list.length > LIMITS.clauses) {
    throw new PolicyError("TOO_MANY_CLAUSES", `Use at most ${LIMITS.clauses} ${kind} clauses.`);
  }
  return [...list]
    .map((clause) => normalizeClause(clause, kind))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function validateScope(input: ScopeCard): ScopeCard {
  const card: ScopeCard = {
    title: normalizeText(input.title, LIMITS.title, "Title"),
    brokenBehavior: normalizeText(input.brokenBehavior, LIMITS.narrative, "Broken behavior"),
    expectedBehavior: normalizeText(input.expectedBehavior, LIMITS.narrative, "Expected behavior"),
    environment: normalizeText(input.environment, LIMITS.environment, "Environment"),
    baselineVersion: normalizeText(input.baselineVersion, LIMITS.version, "Baseline version"),
    included: normalizeList(input.included, "S"),
    excluded: normalizeList(input.excluded, "X"),
    acceptance: normalizeList(input.acceptance, "A"),
    protected: normalizeList(input.protected, "P"),
  };
  if (!card.included.length || !card.acceptance.length) {
    throw new PolicyError(
      "MISSING_REQUIRED_CLAUSE",
      "A scope card needs at least one included clause (S-*) and one acceptance criterion (A-*).",
    );
  }
  const ids = [
    ...card.included,
    ...card.excluded,
    ...card.acceptance,
    ...card.protected,
  ].map((clause) => clause.id);
  if (new Set(ids).size !== ids.length) {
    throw new PolicyError("DUPLICATE_CLAUSE_ID", "Clause ids must be unique across the card.");
  }
  return card;
}

export function parseScopeJson(raw: string): ScopeCard {
  if (raw.length > 24_000) throw new PolicyError("TOO_LARGE", "Scope JSON is over 24,000 characters.");
  const parsed = parseJsonNoDuplicates(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PolicyError("BAD_SCOPE", "Scope JSON must be an object.");
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!SCOPE_KEYS.includes(key as (typeof SCOPE_KEYS)[number])) {
      throw new PolicyError("UNKNOWN_FIELD", `Unknown scope field “${key}”.`);
    }
  }
  const clause = (value: unknown, kind: ClauseKind): Clause[] => {
    if (!Array.isArray(value)) throw new PolicyError("BAD_SCOPE", `${kind} clauses must be a list.`);
    return value.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new PolicyError("BAD_SCOPE", "Each clause must be an object.");
      }
      const row = item as Record<string, unknown>;
      for (const key of Object.keys(row)) {
        if (!["id", "text", "scenario"].includes(key)) {
          throw new PolicyError("UNKNOWN_FIELD", `Unknown clause field “${key}”.`);
        }
      }
      return {
        id: String(row.id ?? ""),
        text: String(row.text ?? ""),
        scenario: String(row.scenario ?? ""),
      };
    });
  };
  return validateScope({
    title: String(record.title ?? ""),
    brokenBehavior: String(record.brokenBehavior ?? ""),
    expectedBehavior: String(record.expectedBehavior ?? ""),
    environment: String(record.environment ?? ""),
    baselineVersion: String(record.baselineVersion ?? ""),
    included: clause(record.included, "S"),
    excluded: clause(record.excluded ?? [], "X"),
    acceptance: clause(record.acceptance, "A"),
    protected: clause(record.protected ?? [], "P"),
  });
}

export function parseJsonNoDuplicates(raw: string): unknown {
  let index = 0;
  const source = raw;
  const fail = (message: string, code = "BAD_JSON"): never => {
    throw new PolicyError(code, message);
  };
  const skip = () => {
    while (index < source.length && /\s/.test(source[index] ?? "")) index += 1;
  };
  const parseString = (): string => {
    if (source[index] !== '"') fail("Expected a string.");
    index += 1;
    let out = "";
    while (index < source.length) {
      const char = source[index];
      if (char === '"') {
        index += 1;
        return out;
      }
      if (char === "\\") {
        const next = source[index + 1];
        const map: Record<string, string> = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        if (!next || (!(next in map) && next !== "u")) fail("Bad escape.");
        if (next === "u") {
          const hex = source.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Bad unicode escape.");
          out += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          continue;
        }
        out += map[next];
        index += 2;
        continue;
      }
      if ((char ?? "") < " ") fail("Raw control character in string.");
      out += char;
      index += 1;
    }
    return fail("Unterminated string.");
  };
  const parseLiteral = (): unknown => {
    if (source.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (source.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (source.startsWith("null", index)) {
      index += 4;
      return null;
    }
    const start = index;
    if (source[index] === "-") index += 1;
    if (!/[0-9]/.test(source[index] ?? "")) fail("Expected a number.");
    if (source[index] === "0") index += 1;
    else while (/[0-9]/.test(source[index] ?? "")) index += 1;
    if (source[index] === ".") {
      index += 1;
      if (!/[0-9]/.test(source[index] ?? "")) fail("Expected a fraction.");
      while (/[0-9]/.test(source[index] ?? "")) index += 1;
    }
    if (source[index] === "e" || source[index] === "E") {
      index += 1;
      if (source[index] === "+" || source[index] === "-") index += 1;
      if (!/[0-9]/.test(source[index] ?? "")) fail("Expected an exponent.");
      while (/[0-9]/.test(source[index] ?? "")) index += 1;
    }
    return JSON.parse(source.slice(start, index));
  };
  const parseValue = (): unknown => {
    skip();
    const char = source[index];
    if (char === "{") return parseObject();
    if (char === "[") return parseArray();
    if (char === '"') return parseString();
    if (char === "t" || char === "f" || char === "n" || char === "-" || (char !== undefined && char >= "0" && char <= "9")) {
      return parseLiteral();
    }
    fail("Unexpected JSON.");
    return undefined;
  };
  const parseObject = (): Record<string, unknown> => {
    index += 1;
    const obj: Record<string, unknown> = {};
    skip();
    if (source[index] === "}") {
      index += 1;
      return obj;
    }
    while (index < source.length) {
      skip();
      if (source[index] !== '"') fail("Expected an object key.");
      const key = parseString();
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fail(`Duplicate JSON key “${key}”.`, "DUPLICATE_KEY");
      }
      skip();
      if (source[index] !== ":") fail("Expected a colon.");
      index += 1;
      obj[key] = parseValue();
      skip();
      if (source[index] === "}") {
        index += 1;
        return obj;
      }
      if (source[index] !== ",") fail("Expected a comma.");
      index += 1;
    }
    return fail("Unterminated object.");
  };
  const parseArray = (): unknown[] => {
    index += 1;
    const list: unknown[] = [];
    skip();
    if (source[index] === "]") {
      index += 1;
      return list;
    }
    while (index < source.length) {
      list.push(parseValue());
      skip();
      if (source[index] === "]") {
        index += 1;
        return list;
      }
      if (source[index] !== ",") fail("Expected a comma.");
      index += 1;
    }
    return fail("Unterminated array.");
  };
  const value = parseValue();
  skip();
  if (index !== source.length) fail("Unexpected trailing JSON.");
  return value;
}

export function environmentCompatible(left: string, right: string): boolean {
  const norm = (value: string) => value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
  return norm(left) === norm(right);
}

export function clauseMap(card: ScopeCard): Map<string, Clause> {
  return new Map(
    [...card.included, ...card.excluded, ...card.acceptance, ...card.protected].map((clause) => [
      clause.id,
      clause,
    ]),
  );
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  submitter: string;
  contentHash: string;
  content: string;
  referenceVersion: string;
  scenario: string;
  environment: string;
  preState: string;
  postState: string;
  provenance: string;
  addedDuringReview: boolean;
}

export interface Statement {
  id: string;
  author: string;
  text: string;
  at: number;
}

export interface Acknowledgement {
  evidenceId: string;
  contentHash: string;
  address: string;
  at: number;
}

export interface DecisionInput {
  scope: ScopeCard;
  requestText: string;
  citedClauseIds: string[];
  evidence: Evidence[];
  localPreview: boolean;
}

function limitations(localPreview: boolean): string[] {
  const items = [...BASE_LIMITATIONS];
  if (localPreview) {
    items.push(
      "Recorded by the local deterministic policy preview. It is not a GenLayer consensus result.",
    );
  }
  items.push("Public excerpts are unverified party text, not authenticated web truth.");
  return items;
}

function decisionShell(
  cited: string[],
  evidenceRefs: string[],
  localPreview: boolean,
): Pick<Decision, "clauseRefs" | "evidenceRefs" | "limitations" | "reviewStatus"> {
  return {
    clauseRefs: [...cited].sort(),
    evidenceRefs: [...evidenceRefs].sort(),
    limitations: limitations(localPreview),
    reviewStatus: "NONE",
  };
}

export function protectedGate(
  scope: ScopeCard,
  citedProtected: string[],
  evidence: Evidence[],
): { ok: true; evidenceRefs: string[] } | { ok: false; missing: string[]; evidenceRefs: string[] } {
  const map = clauseMap(scope);
  const used = new Set<string>();
  const missing = new Set<string>();
  for (const id of citedProtected) {
    const clause = map.get(id);
    if (!clause?.scenario) {
      missing.add("MATCHING_SCENARIO");
      continue;
    }
    const pool = evidence.filter(
      (item) =>
        !item.addedDuringReview &&
        item.scenario.trim().toLowerCase() === clause.scenario.trim().toLowerCase(),
    );
    const baseline = pool.find((item) => item.type === "BASELINE_REPORT");
    const post = pool.find((item) => item.type === "POST_PATCH_REPORT");
    if (!baseline) missing.add("BASELINE_REPORT");
    if (!post) missing.add("POST_PATCH_REPORT");
    for (const item of [baseline, post]) {
      if (!item) continue;
      used.add(item.id);
      if (!environmentCompatible(scope.environment, item.environment)) missing.add("COMPATIBLE_ENVIRONMENT");
      if (!item.preState.trim()) missing.add("PRE_STATE");
      if (!item.postState.trim()) missing.add("POST_STATE");
      if (!item.referenceVersion.trim()) missing.add("REFERENCE_VERSION");
      if (item.provenance === "unverified-public-excerpt" || item.type === "PUBLIC_EXCERPT") {
        missing.add("STRUCTURED_REPORT");
      }
    }
  }
  const evidenceRefs = [...used].sort();
  if (missing.size) return { ok: false, missing: [...missing].sort(), evidenceRefs };
  return { ok: true, evidenceRefs };
}

export function decideInitial(input: DecisionInput): Decision {
  const scope = validateScope(input.scope);
  const requestText = normalizeText(input.requestText, LIMITS.request, "Request");
  if (requestText.length < LIMITS.requestMin) {
    throw new PolicyError("TOO_SHORT", "Describe the disputed request in at least 20 characters.");
  }
  const known = clauseMap(scope);
  const cited = [...new Set(input.citedClauseIds.map((id) => id.trim().toUpperCase()))];
  if (!cited.length || cited.length > LIMITS.cited) {
    throw new PolicyError("BAD_CITATIONS", "Cite 1 to 4 clause ids from the accepted card.");
  }
  for (const id of cited) {
    if (!known.has(id)) throw new PolicyError("UNKNOWN_CLAUSE_REF", `${id} is not in the frozen card.`);
  }
  const included = cited.filter((id) => id.startsWith("S-"));
  const excluded = cited.filter((id) => id.startsWith("X-"));
  const acceptance = cited.filter((id) => id.startsWith("A-"));
  const protectedIds = cited.filter((id) => id.startsWith("P-"));
  const shell = decisionShell(cited, [], input.localPreview);

  if (atomicityIssue(requestText)) {
    return {
      ...shell,
      classification: "INSUFFICIENT_EVIDENCE",
      reasonCode: "NON_ATOMIC_REQUEST",
      summary: "The request is not one atomic demand, so it cannot be classified against a single scope.",
      missingEvidence: ["ONE_ATOMIC_REQUEST"],
    };
  }
  if (included.length && excluded.length) {
    return {
      ...shell,
      classification: "INSUFFICIENT_EVIDENCE",
      reasonCode: "MIXED_SCOPE",
      summary: "The request cites both an included clause and an excluded clause, so the scope is ambiguous.",
      missingEvidence: ["DISAMBIGUATE_INCLUDED_OR_EXCLUDED"],
    };
  }
  if (protectedIds.length) {
    const gate = protectedGate(scope, protectedIds, input.evidence);
    if (!gate.ok) {
      return {
        ...shell,
        evidenceRefs: gate.evidenceRefs,
        classification: "INSUFFICIENT_EVIDENCE",
        reasonCode: "CAUSATION_NOT_ESTABLISHED",
        summary:
          "A protected behavior was cited, but the frozen packet lacks a matching baseline and post-patch report with declared states and a compatible environment. Keyword overlap is not causation.",
        missingEvidence: gate.missing,
      };
    }
    shell.evidenceRefs = gate.evidenceRefs;
  }
  if (excluded.length && !included.length) {
    return {
      ...shell,
      classification: "CHANGE_REQUEST",
      reasonCode: "MATCHES_EXCLUDED",
      summary: `The request cites excluded ${excluded.join(", ")} and does not cite an included clause.`,
      missingEvidence: [],
    };
  }
  if (!included.length || !acceptance.length) {
    return {
      ...shell,
      classification: "INSUFFICIENT_EVIDENCE",
      reasonCode: "CLAUSE_REFERENCE_INCOMPLETE",
      summary: "An in-scope result needs at least one included clause and one acceptance criterion.",
      missingEvidence: [
        ...(!included.length ? ["INCLUDED_CLAUSE"] : []),
        ...(!acceptance.length ? ["ACCEPTANCE_CRITERION"] : []),
      ],
    };
  }
  const supporting = input.evidence.filter(
    (item) =>
      !item.addedDuringReview &&
      (item.type === "TEST_REPORT" || item.type === "POST_PATCH_REPORT") &&
      environmentCompatible(scope.environment, item.environment) &&
      item.scenario.trim().length > 0,
  );
  if (!supporting.length) {
    return {
      ...shell,
      classification: "INSUFFICIENT_EVIDENCE",
      reasonCode: "MISSING_ADMISSIBLE_EVIDENCE",
      summary:
        "Included and acceptance clauses are cited, but the packet has no test or post-patch report in the agreed environment.",
      missingEvidence: ["TEST_OR_POST_PATCH_REPORT"],
    };
  }
  const refs = [...new Set([...shell.evidenceRefs, ...supporting.map((item) => item.id)])].sort();
  return {
    ...shell,
    evidenceRefs: refs,
    classification: "IN_SCOPE",
    reasonCode: "MATCHES_INCLUDED_AND_ACCEPTANCE",
    summary: `The request cites ${included.join(", ")} and ${acceptance.join(", ")}, with admissible evidence ${refs.join(", ")} in the agreed environment.`,
    missingEvidence: [],
  };
}

export interface AgreementVersion {
  version: number;
  card: ScopeCard;
  hash: string;
  createdAt: number;
}

export interface Acceptance {
  address: string;
  version: number;
  hash: string;
  at: number;
}

export interface Agreement {
  id: string;
  developer: string;
  client: string;
  status: AgreementStatus;
  versions: AgreementVersion[];
  acceptances: Acceptance[];
  proposer: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  priorAgreementId?: string;
  sourceCaseId?: string;
  onChainTxHash?: string;
  onChainStatus?: "NOT_SUBMITTED" | "SUBMITTED" | "CONFIRMED" | "ACCEPTED" | "FINALIZED" | "REVERTED";
}

export interface FreezeApproval {
  address: string;
  packetHash: string;
  at: number;
}

export interface ReviewRecord {
  grounds: ReviewGrounds;
  note: string;
  overlookedClauseId: string;
  openedBy: string;
  openedAt: number;
  deadlineAt: number;
  evidence: Evidence[];
  result?: Decision;
}

export interface FrozenPacket {
  scope: ScopeCard;
  agreementHash: string;
  agreementVersion: number;
  policyVersion: string;
  policyHash: string;
  requestText: string;
  citedClauseIds: string[];
  statements: Statement[];
  evidence: Evidence[];
  acknowledgements: Acknowledgement[];
  packetHash: string;
}

export interface CaseRecord {
  id: string;
  agreementId: string;
  openedBy: string;
  status: CaseStatus;
  requestText: string;
  citedClauseIds: string[];
  statements: Statement[];
  evidence: Evidence[];
  acknowledgements: Acknowledgement[];
  deadlineAt: number;
  freezeApprovals: FreezeApproval[];
  frozen?: FrozenPacket;
  decision?: Decision;
  review?: ReviewRecord;
  createdAt: number;
  updatedAt: number;
  onChainTxHash?: string;
  onChainStatus?: "NOT_SUBMITTED" | "SUBMITTED" | "CONFIRMED" | "ACCEPTED" | "FINALIZED" | "REVERTED";
  decisionTxHash?: string;
}

export function currentVersion(agreement: Agreement): AgreementVersion {
  const version = agreement.versions[agreement.versions.length - 1];
  if (!version) throw new PolicyError("NO_VERSION", "This agreement has no version.");
  return version;
}

export function isParty(address: string, agreement: Pick<Agreement, "developer" | "client">): boolean {
  const actor = normalizeAddress(address);
  return actor === agreement.developer || actor === agreement.client;
}

export function changedFields(before: ScopeCard, after: ScopeCard): string[] {
  const keys: (keyof ScopeCard)[] = [
    "title",
    "brokenBehavior",
    "expectedBehavior",
    "environment",
    "baselineVersion",
    "included",
    "excluded",
    "acceptance",
    "protected",
  ];
  return keys.filter((key) => stableStringify(before[key]) !== stableStringify(after[key]));
}

async function packetBody(record: CaseRecord, agreement: Agreement): Promise<string> {
  const version = currentVersion(agreement);
  return stableStringify({
    acknowledgements: [...record.acknowledgements].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
    agreementHash: version.hash,
    agreementVersion: version.version,
    citedClauseIds: [...record.citedClauseIds].sort(),
    evidence: record.evidence.filter((item) => !item.addedDuringReview).map(publicEvidence),
    policyHash: POLICY_HASH,
    policyVersion: POLICY_VERSION,
    requestText: record.requestText,
    statements: record.statements.map(({ id, author, text }) => ({ author, id, text })),
  });
}

function publicEvidence(item: Evidence) {
  return {
    contentHash: item.contentHash,
    environment: item.environment,
    id: item.id,
    postState: item.postState,
    preState: item.preState,
    provenance: item.provenance,
    referenceVersion: item.referenceVersion,
    scenario: item.scenario,
    submitter: item.submitter,
    type: item.type,
  };
}

export async function currentPacketHash(record: CaseRecord, agreement: Agreement): Promise<string> {
  return sha256Hex(`patchscope-packet-v1\n${await packetBody(record, agreement)}`);
}

function assertParty(actor: string, agreement: Agreement): string {
  const address = normalizeAddress(actor);
  if (!isParty(address, agreement)) {
    throw new PolicyError("NOT_A_PARTY", "Only the developer or client on this card can do that.");
  }
  return address;
}

function assertOpen(record: CaseRecord): void {
  if (record.status !== "OPEN") {
    throw new PolicyError("CASE_NOT_OPEN", "The packet is frozen. This input was not added.");
  }
}

function assertAcceptingInput(record: CaseRecord, now: number): void {
  assertOpen(record);
  if (now >= record.deadlineAt) {
    throw new PolicyError(
      "RESPONSE_WINDOW_CLOSED",
      "The response window has closed. New input was not added. Freeze the packet instead.",
    );
  }
}

export function paginate<T extends { id: string; createdAt: number }>(
  items: T[],
  cursor: string,
  limit: number,
): { items: T[]; nextCursor: string | null } {
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_MAX) {
    throw new PolicyError("BAD_LIMIT", `Page size must be an integer from 1 to ${PAGE_MAX}.`);
  }
  const ordered = [...items].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  let start = 0;
  if (cursor) {
    const index = ordered.findIndex((item) => item.id === cursor);
    if (index < 0) throw new PolicyError("BAD_CURSOR", "That cursor does not match a record in this list.");
    start = index + 1;
  }
  const slice = ordered.slice(start, start + limit);
  const nextCursor = start + limit < ordered.length ? (slice[slice.length - 1]?.id ?? null) : null;
  return { items: slice, nextCursor };
}

export async function proposeAgreement(input: {
  id: string;
  developer: string;
  client: string;
  proposer: string;
  card: ScopeCard;
  now: number;
  priorAgreementId?: string;
  sourceCaseId?: string;
}): Promise<Agreement> {
  assertTime(input.now);
  const developer = normalizeAddress(input.developer);
  const client = normalizeAddress(input.client);
  const proposer = normalizeAddress(input.proposer);
  if (developer === client) {
    throw new PolicyError("SAME_PARTY", "Developer and client must be two different addresses.");
  }
  if (proposer !== developer && proposer !== client) {
    throw new PolicyError("NOT_A_PARTY", "The proposer must be the developer or the client.");
  }
  const card = validateScope(input.card);
  const hash = await agreementHash(card);
  return {
    id: input.id,
    developer,
    client,
    status: "PROPOSED",
    versions: [{ version: 1, card, hash, createdAt: input.now }],
    acceptances: [],
    proposer,
    expiresAt: input.now + PROPOSAL_TTL_MS,
    createdAt: input.now,
    updatedAt: input.now,
    priorAgreementId: input.priorAgreementId,
    sourceCaseId: input.sourceCaseId,
  };
}

export async function reviseAgreement(
  agreement: Agreement,
  actor: string,
  card: ScopeCard,
  now: number,
): Promise<Agreement> {
  assertTime(now);
  assertParty(actor, agreement);
  if (agreement.status !== "PROPOSED") {
    throw new PolicyError("NOT_PROPOSED", "Only a live proposal can be revised. An accepted card is immutable.");
  }
  if (now >= agreement.expiresAt) {
    throw new PolicyError("PROPOSAL_EXPIRED", "This proposal is past its deadline. Expire it instead of revising.");
  }
  const nextCard = validateScope(card);
  const hash = await agreementHash(nextCard);
  const version = currentVersion(agreement).version + 1;
  return {
    ...agreement,
    acceptances: [],
    updatedAt: now,
    versions: [...agreement.versions, { version, card: nextCard, hash, createdAt: now }],
  };
}

export function rejectAgreement(agreement: Agreement, actor: string, now: number): Agreement {
  assertTime(now);
  assertParty(actor, agreement);
  if (agreement.status !== "PROPOSED") {
    throw new PolicyError("NOT_PROPOSED", "Only a proposal can be rejected.");
  }
  return { ...agreement, status: "REJECTED", acceptances: [], updatedAt: now };
}

export function expireAgreement(agreement: Agreement, now: number): Agreement {
  assertTime(now);
  if (agreement.status !== "PROPOSED") {
    throw new PolicyError("NOT_PROPOSED", "Only a proposal can expire.");
  }
  if (now < agreement.expiresAt) {
    throw new PolicyError("DEADLINE_OPEN", "The proposal deadline has not been reached.");
  }
  return { ...agreement, status: "EXPIRED", updatedAt: now };
}

export function acceptAgreement(
  agreement: Agreement,
  actor: string,
  version: number,
  hash: string,
  now: number,
): Agreement {
  assertTime(now);
  const address = assertParty(actor, agreement);
  if (agreement.status !== "PROPOSED") {
    throw new PolicyError("NOT_PROPOSED", "This card is not waiting for acceptance.");
  }
  if (now >= agreement.expiresAt) {
    throw new PolicyError("PROPOSAL_EXPIRED", "The proposal expired before this acceptance.");
  }
  const current = currentVersion(agreement);
  if (current.version !== version || current.hash !== hash) {
    throw new PolicyError(
      "STALE_HASH",
      "Acceptance must match the current version and canonical hash. Reload the card.",
    );
  }
  const acceptances = agreement.acceptances.filter((item) => item.address !== address);
  acceptances.push({ address, version, hash, at: now });
  const both =
    acceptances.some((item) => item.address === agreement.developer && item.hash === hash) &&
    acceptances.some((item) => item.address === agreement.client && item.hash === hash);
  return {
    ...agreement,
    acceptances,
    status: both ? "ACCEPTED" : "PROPOSED",
    updatedAt: now,
  };
}

export function openCase(input: {
  id: string;
  agreement: Agreement;
  actor: string;
  requestText: string;
  citedClauseIds: string[];
  windowMs: number;
  now: number;
}): CaseRecord {
  assertTime(input.now);
  const actor = assertParty(input.actor, input.agreement);
  if (input.agreement.status !== "ACCEPTED") {
    throw new PolicyError("AGREEMENT_NOT_ACTIVE", "Open a case only against an accepted agreement.");
  }
  if (!Number.isFinite(input.windowMs) || input.windowMs < 60_000 || input.windowMs > 30 * 24 * 60 * 60 * 1000) {
    throw new PolicyError("BAD_WINDOW", "Choose a response window between 1 minute and 30 days.");
  }
  const requestText = normalizeText(input.requestText, LIMITS.request, "Request");
  if (requestText.length < LIMITS.requestMin) {
    throw new PolicyError("TOO_SHORT", "Describe the one disputed request in at least 20 characters.");
  }
  const issue = atomicityIssue(requestText);
  if (issue) throw new PolicyError("NON_ATOMIC_REQUEST", issue);
  const known = clauseMap(currentVersion(input.agreement).card);
  const cited = [...new Set(input.citedClauseIds.map((id) => id.trim().toUpperCase()))];
  if (!cited.length || cited.length > LIMITS.cited) {
    throw new PolicyError("BAD_CITATIONS", "Cite 1 to 4 clauses from the accepted card.");
  }
  for (const id of cited) {
    if (!known.has(id)) throw new PolicyError("UNKNOWN_CLAUSE_REF", `${id} is not on the accepted card.`);
  }
  return {
    id: input.id,
    agreementId: input.agreement.id,
    openedBy: actor,
    status: "OPEN",
    requestText,
    citedClauseIds: cited,
    statements: [],
    evidence: [],
    acknowledgements: [],
    deadlineAt: input.now + input.windowMs,
    freezeApprovals: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function touch(record: CaseRecord, now: number): CaseRecord {
  return { ...record, freezeApprovals: [], updatedAt: now };
}

export function addStatement(record: CaseRecord, agreement: Agreement, actor: string, text: string, now: number): CaseRecord {
  assertTime(now);
  const author = assertParty(actor, agreement);
  assertAcceptingInput(record, now);
  if (record.statements.length >= LIMITS.statements) {
    throw new PolicyError("STATEMENT_LIMIT", "The statement history is full.");
  }
  const clean = normalizeText(text, LIMITS.statement, "Statement");
  const next: CaseRecord = {
    ...record,
    statements: [
      ...record.statements,
      { id: `ST-${record.statements.length + 1}`, author, text: clean, at: now },
    ],
  };
  return touch(next, now);
}

const EVIDENCE_TYPES = new Set<EvidenceType>([
  "BASELINE_REPORT",
  "POST_PATCH_REPORT",
  "TEST_REPORT",
  "PUBLIC_EXCERPT",
]);

export async function addEvidence(
  record: CaseRecord,
  agreement: Agreement,
  actor: string,
  draft: Omit<Evidence, "id" | "submitter" | "contentHash" | "addedDuringReview" | "provenance"> & {
    provenance?: string;
  },
  now: number,
  duringReview = false,
): Promise<{ record: CaseRecord; evidence: Evidence }> {
  assertTime(now);
  const submitter = assertParty(actor, agreement);
  if (duringReview) {
    const review = record.review;
    if (record.status !== "IN_REVIEW" || !review || review.grounds !== "NEW_EVIDENCE") {
      throw new PolicyError("REVIEW_CLOSED", "New evidence belongs only in an open new-evidence review.");
    }
    if (review.evidence.length >= LIMITS.reviewEvidence) {
      throw new PolicyError("EVIDENCE_LIMIT", "The review evidence limit has been reached.");
    }
    if (now >= review.deadlineAt) {
      throw new PolicyError(
        "RESPONSE_WINDOW_CLOSED",
        "The review window has closed. Finish the review. This evidence was not added.",
      );
    }
  } else {
    assertAcceptingInput(record, now);
    if (record.evidence.length >= LIMITS.evidenceCount) {
      throw new PolicyError("EVIDENCE_LIMIT", "The evidence list is full.");
    }
  }
  if (!EVIDENCE_TYPES.has(draft.type)) throw new PolicyError("BAD_EVIDENCE_TYPE", "Unsupported evidence type.");
  const content = normalizeText(draft.content, LIMITS.evidence, "Evidence content");
  const contentHash = await sha256Hex(`patchscope-evidence-v1\n${content}`);
  const provenance =
    draft.type === "PUBLIC_EXCERPT" ? "unverified-public-excerpt" : "party-submitted";
  const evidence: Evidence = {
    id: duringReview
      ? `R-${(record.review?.evidence.length ?? 0) + 1}`
      : `E-${record.evidence.length + 1}`,
    type: draft.type,
    submitter,
    contentHash,
    content,
    referenceVersion: optionalText(draft.referenceVersion, LIMITS.version, "Reference version"),
    scenario: optionalText(draft.scenario, LIMITS.scenario, "Scenario"),
    environment: optionalText(draft.environment, LIMITS.environment, "Evidence environment"),
    preState: optionalText(draft.preState, 300, "Pre-patch state"),
    postState: optionalText(draft.postState, 300, "Post-patch state"),
    provenance,
    addedDuringReview: duringReview,
  };
  if (draft.type !== "PUBLIC_EXCERPT" && (!evidence.environment || !evidence.scenario)) {
    throw new PolicyError(
      "INCOMPLETE_EVIDENCE",
      "Reports need a scenario and an environment. Public excerpts stay labeled unverified.",
    );
  }
  const projected = duringReview
    ? stableStringify(record.review)
    : stableStringify({ ...record, evidence: [...record.evidence, evidence] });
  if (projected.length > LIMITS.packet) {
    throw new PolicyError("PACKET_TOO_LARGE", "That input would make the packet larger than the v1 bound.");
  }
  if (duringReview && record.review) {
    return {
      evidence,
      record: {
        ...record,
        updatedAt: now,
        review: { ...record.review, evidence: [...record.review.evidence, evidence] },
      },
    };
  }
  return { evidence, record: touch({ ...record, evidence: [...record.evidence, evidence] }, now) };
}

export function acknowledgeEvidence(
  record: CaseRecord,
  agreement: Agreement,
  actor: string,
  evidenceId: string,
  contentHash: string,
  now: number,
): CaseRecord {
  assertTime(now);
  const address = assertParty(actor, agreement);
  assertAcceptingInput(record, now);
  const evidence = record.evidence.find((item) => item.id === evidenceId);
  if (!evidence) throw new PolicyError("MISSING_EVIDENCE", "That evidence id is not in the packet.");
  if (evidence.contentHash !== contentHash) {
    throw new PolicyError("STALE_HASH", "Acknowledge the exact current content hash.");
  }
  if (address === evidence.submitter) {
    throw new PolicyError("NOT_COUNTERPARTY", "The other party acknowledges. This does not verify the content.");
  }
  const acknowledgements = record.acknowledgements.filter(
    (item) => !(item.evidenceId === evidenceId && item.address === address),
  );
  acknowledgements.push({ evidenceId, contentHash, address, at: now });
  return touch({ ...record, acknowledgements }, now);
}

export async function approveFreeze(
  record: CaseRecord,
  agreement: Agreement,
  actor: string,
  now: number,
): Promise<CaseRecord> {
  assertTime(now);
  const address = assertParty(actor, agreement);
  assertAcceptingInput(record, now);
  const packetHash = await currentPacketHash(record, agreement);
  const freezeApprovals = record.freezeApprovals.filter((item) => item.address !== address);
  freezeApprovals.push({ address, packetHash, at: now });
  return { ...record, freezeApprovals, updatedAt: now };
}

export async function freezeCase(
  record: CaseRecord,
  agreement: Agreement,
  now: number,
  allowDeadline: boolean,
): Promise<CaseRecord> {
  assertTime(now);
  assertOpen(record);
  const version = currentVersion(agreement);
  if (agreement.status !== "ACCEPTED" || version.hash == null) {
    throw new PolicyError("AGREEMENT_NOT_ACTIVE", "Freeze requires the accepted agreement.");
  }
  const packetHash = await currentPacketHash(record, agreement);
  const developerOk = record.freezeApprovals.some(
    (item) => item.address === agreement.developer && item.packetHash === packetHash,
  );
  const clientOk = record.freezeApprovals.some(
    (item) => item.address === agreement.client && item.packetHash === packetHash,
  );
  const deadlineReached = allowDeadline && now >= record.deadlineAt;
  if (!deadlineReached && !(developerOk && clientOk)) {
    throw new PolicyError(
      "FREEZE_NOT_READY",
      "Freeze needs both parties on this exact packet, or a reached deadline. Nothing was frozen.",
    );
  }
  if (allowDeadline && now < record.deadlineAt && !(developerOk && clientOk)) {
    throw new PolicyError("DEADLINE_OPEN", "The deadline has not been reached.");
  }
  const frozen: FrozenPacket = {
    scope: version.card,
    agreementHash: version.hash,
    agreementVersion: version.version,
    policyVersion: POLICY_VERSION,
    policyHash: POLICY_HASH,
    requestText: record.requestText,
    citedClauseIds: [...record.citedClauseIds],
    statements: record.statements.map((item) => ({ ...item })),
    evidence: record.evidence.map((item) => ({ ...item })),
    acknowledgements: record.acknowledgements.map((item) => ({ ...item })),
    packetHash,
  };
  return { ...record, status: "FROZEN", frozen, updatedAt: now };
}

export function decideCase(record: CaseRecord, actor: string, agreement: Agreement, now: number): CaseRecord {
  assertTime(now);
  assertParty(actor, agreement);
  if (record.decision) throw new PolicyError("DECISION_EXISTS", "This case already has its one initial decision.");
  if (record.status !== "FROZEN" || !record.frozen) {
    throw new PolicyError("NOT_FROZEN", "Decide only a frozen packet.");
  }
  const decision = decideInitial({
    scope: record.frozen.scope,
    requestText: record.frozen.requestText,
    citedClauseIds: record.frozen.citedClauseIds,
    evidence: record.frozen.evidence,
    localPreview: true,
  });
  return { ...record, status: "DECIDED", decision, updatedAt: now };
}

export function openReview(input: {
  record: CaseRecord;
  agreement: Agreement;
  actor: string;
  grounds: ReviewGrounds;
  note: string;
  overlookedClauseId: string;
  windowMs: number;
  now: number;
}): CaseRecord {
  assertTime(input.now);
  const actor = assertParty(input.actor, input.agreement);
  if (input.record.status !== "DECIDED" || !input.record.decision) {
    throw new PolicyError("REVIEW_CLOSED", "Review opens once, after the initial decision.");
  }
  if (input.record.review) throw new PolicyError("REVIEW_EXISTS", "This case already used its one review.");
  if (input.grounds !== "NEW_EVIDENCE" && input.grounds !== "OVERLOOKED_REFERENCE") {
    throw new PolicyError("BAD_GROUNDS", "Review grounds are new evidence or an overlooked reference.");
  }
  if (!Number.isFinite(input.windowMs) || input.windowMs < 60_000 || input.windowMs > 14 * 24 * 60 * 60 * 1000) {
    throw new PolicyError("BAD_WINDOW", "Choose a review window between 1 minute and 14 days.");
  }
  const note = normalizeText(input.note, LIMITS.statement, "Review note");
  let overlooked = "";
  if (input.grounds === "OVERLOOKED_REFERENCE") {
    overlooked = input.overlookedClauseId.trim().toUpperCase();
    const known = clauseMap(input.record.frozen?.scope ?? currentVersion(input.agreement).card);
    if (!known.has(overlooked)) throw new PolicyError("UNKNOWN_CLAUSE_REF", "That clause is not in the frozen card.");
    if (input.record.decision.clauseRefs.includes(overlooked)) {
      throw new PolicyError("NOT_OVERLOOKED", "That clause was already referenced by the decision.");
    }
    const cited = input.record.frozen?.citedClauseIds ?? [];
    if (!cited.includes(overlooked) && cited.length >= 4) {
      throw new PolicyError("CITATION_CAP", "A review cannot cite more than four clauses.");
    }
  }
  return {
    ...input.record,
    status: "IN_REVIEW",
    updatedAt: input.now,
    review: {
      grounds: input.grounds,
      note,
      overlookedClauseId: overlooked,
      openedBy: actor,
      openedAt: input.now,
      deadlineAt: input.now + input.windowMs,
      evidence: [],
    },
  };
}

export function finalizeReview(record: CaseRecord, agreement: Agreement, actor: string, now: number): CaseRecord {
  assertTime(now);
  assertParty(actor, agreement);
  if (record.status !== "IN_REVIEW" || !record.review || !record.decision || !record.frozen) {
    throw new PolicyError("REVIEW_CLOSED", "There is no open review to finish.");
  }
  const original = record.decision;
  let result: Decision;
  if (record.review.grounds === "NEW_EVIDENCE" && record.review.evidence.length === 0 && now < record.review.deadlineAt) {
    throw new PolicyError(
      "REVIEW_WINDOW_OPEN",
      "The review window is still open and no new evidence is attached. Finish after the deadline, or attach the report first.",
    );
  }
  if (record.review.grounds === "NEW_EVIDENCE" && record.review.evidence.length === 0) {
    result = {
      ...original,
      reviewStatus: "REVIEW_NOT_ADMISSIBLE",
      summary: "The review claimed new evidence, but none was added before it closed.",
      limitations: limitations(true),
    };
  } else if (record.review.grounds === "OVERLOOKED_REFERENCE" && !record.review.overlookedClauseId) {
    result = {
      ...original,
      reviewStatus: "REVIEW_NOT_ADMISSIBLE",
      summary: "The review did not identify an overlooked clause in the frozen card.",
      limitations: limitations(true),
    };
  } else {
    const cited =
      record.review.grounds === "OVERLOOKED_REFERENCE"
        ? [...record.frozen.citedClauseIds, record.review.overlookedClauseId]
        : record.frozen.citedClauseIds;
    const evidence = [...record.frozen.evidence, ...record.review.evidence.map((item) => ({ ...item, addedDuringReview: false }))];
    const next = decideInitial({
      scope: record.frozen.scope,
      requestText: record.frozen.requestText,
      citedClauseIds: cited,
      evidence,
      localPreview: true,
    });
    if (next.classification === original.classification) {
      result = {
        ...original,
        reviewStatus: "UPHELD",
        summary: "The review was considered and the classification did not change.",
        limitations: limitations(true),
      };
    } else {
      result = { ...next, reviewStatus: "REVISED" };
    }
  }
  return {
    ...record,
    status: "REVIEWED",
    updatedAt: now,
    review: { ...record.review, result },
  };
}

export function effectiveDecision(record: CaseRecord): Decision | undefined {
  if (record.review?.result?.reviewStatus === "REVISED") return record.review.result;
  return record.decision;
}

export function assertChangeOrderAllowed(record: CaseRecord): void {
  const decision = effectiveDecision(record);
  if (!decision || decision.classification !== "CHANGE_REQUEST") {
    throw new PolicyError(
      "CHANGE_ORDER_UNAVAILABLE",
      "A change order opens only after the effective result is CHANGE_REQUEST.",
    );
  }
  if (record.status !== "DECIDED" && record.status !== "REVIEWED") {
    throw new PolicyError("CHANGE_ORDER_UNAVAILABLE", "Finish the case before opening a change order.");
  }
}
