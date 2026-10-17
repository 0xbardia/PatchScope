"""Deterministic PatchScope rules. Not a GenLayer Direct Mode run."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from typing import Any

POLICY_VERSION = "patchscope-v1.0.0"
POLICY_DOCUMENT = "\n".join(
    [
        "patchscope-v1.0.0",
        "classifications:IN_SCOPE,CHANGE_REQUEST,INSUFFICIENT_EVIDENCE",
        "reasons:MATCHES_INCLUDED_AND_ACCEPTANCE,MATCHES_EXCLUDED,CLAUSE_REFERENCE_INCOMPLETE,MIXED_SCOPE,NON_ATOMIC_REQUEST,CAUSATION_NOT_ESTABLISHED,MISSING_ADMISSIBLE_EVIDENCE,ENVIRONMENT_MISMATCH",
        "no-payment",
        "no-admin",
        "web-import:disabled",
        "max-page:50",
        "review:NEW_EVIDENCE,OVERLOOKED_REFERENCE",
        "review-results:UPHELD,REVISED,REVIEW_NOT_ADMISSIBLE",
    ]
)
POLICY_HASH = hashlib.sha256(POLICY_DOCUMENT.encode()).hexdigest()
CLAUSE_ID = re.compile(r"^(S|X|A|P)-[1-9][0-9]{0,3}$")
ADDRESS = re.compile(r"^0x[0-9a-fA-F]{40}$")


class PolicyError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _clean(value: str, limit: int, label: str, required: bool = True) -> str:
    text = unicodedata.normalize("NFC", value or "")
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]", "", text)
    text = re.sub(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]", "", text).strip()
    if required and not text:
        raise PolicyError("EMPTY_FIELD", f"{label} is required.")
    if len(text) > limit:
        raise PolicyError("TOO_LONG", f"{label} is too long.")
    return text


def _clauses(rows: list[dict[str, Any]], kind: str) -> list[dict[str, str]]:
    if len(rows) > 24:
        raise PolicyError("TOO_MANY_CLAUSES", f"Use at most 24 {kind} clauses.")
    cleaned = []
    for row in rows:
        clause_id = str(row.get("id", "")).strip().upper()
        if not CLAUSE_ID.match(clause_id) or not clause_id.startswith(f"{kind}-"):
            raise PolicyError("BAD_CLAUSE_ID", f"Bad clause id {clause_id}.")
        scenario = _clean(str(row.get("scenario", "")), 120, "scenario", required=False)
        if kind == "P" and not scenario:
            raise PolicyError("MISSING_SCENARIO", f"{clause_id} needs a scenario.")
        cleaned.append(
            {
                "id": clause_id,
                "text": _clean(str(row.get("text", "")), 500, clause_id),
                "scenario": scenario,
            }
        )
    cleaned.sort(key=lambda item: item["id"])
    return cleaned


def validate_scope(raw: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        "title",
        "brokenBehavior",
        "expectedBehavior",
        "environment",
        "baselineVersion",
        "included",
        "excluded",
        "acceptance",
        "protected",
    }
    extra = set(raw) - allowed
    if extra:
        raise PolicyError("UNKNOWN_FIELD", "Scope JSON has a field the policy does not use.")
    card = {
        "title": _clean(str(raw.get("title", "")), 120, "Title"),
        "brokenBehavior": _clean(str(raw.get("brokenBehavior", "")), 2000, "Broken behavior"),
        "expectedBehavior": _clean(str(raw.get("expectedBehavior", "")), 2000, "Expected behavior"),
        "environment": _clean(str(raw.get("environment", "")), 300, "Environment"),
        "baselineVersion": _clean(str(raw.get("baselineVersion", "")), 120, "Baseline"),
        "included": _clauses(list(raw.get("included") or []), "S"),
        "excluded": _clauses(list(raw.get("excluded") or []), "X"),
        "acceptance": _clauses(list(raw.get("acceptance") or []), "A"),
        "protected": _clauses(list(raw.get("protected") or []), "P"),
    }
    if not card["included"] or not card["acceptance"]:
        raise PolicyError("MISSING_REQUIRED_CLAUSE", "Need at least one S clause and one A clause.")
    ids = [item["id"] for group in ("included", "excluded", "acceptance", "protected") for item in card[group]]
    if len(ids) != len(set(ids)):
        raise PolicyError("DUPLICATE_CLAUSE_ID", "Clause ids must be unique.")
    return card


def canonical_scope(card: dict[str, Any]) -> str:
    return json.dumps(card, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def agreement_hash(card: dict[str, Any]) -> str:
    payload = "patchscope-agreement-v1\n" + canonical_scope(card)
    return hashlib.sha256(payload.encode()).hexdigest()


def normalize_address(value: str) -> str:
    if not ADDRESS.match(value.strip()):
        raise PolicyError("BAD_ADDRESS", "Address must be 0x plus 40 hex characters.")
    return value.strip().lower()


def atomicity_issue(text: str) -> bool:
    lines = [line.strip() for line in text.splitlines()]
    return sum(1 for line in lines if re.match(r"^\d+[\.\)\]]\s+\S+", line)) >= 3


def extend_citations(cited: list, overlooked: str) -> list[str]:
    nxt = [str(item).strip().upper() for item in cited]
    extra = str(overlooked or "").strip().upper()
    if extra and extra not in nxt:
        nxt.append(extra)
    if len(nxt) > 4:
        raise PolicyError("CITATION_CAP", "A review cannot cite more than four clauses.")
    return nxt


def _env(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def decide(scope: dict[str, Any], request: str, cited: list[str], evidence: list[dict[str, Any]]) -> dict[str, Any]:
    card = validate_scope(scope)
    text = _clean(request, 1500, "Request")
    if len(text) < 20:
        raise PolicyError("TOO_SHORT", "Request is too short.")
    known = {
        item["id"]: item
        for group in ("included", "excluded", "acceptance", "protected")
        for item in card[group]
    }
    refs = []
    for clause_id in cited:
        clause_id = clause_id.strip().upper()
        if clause_id not in known:
            raise PolicyError("UNKNOWN_CLAUSE_REF", f"{clause_id} is not on the card.")
        if clause_id not in refs:
            refs.append(clause_id)
    if not refs or len(refs) > 4:
        raise PolicyError("BAD_CITATIONS", "Cite 1 to 4 clauses.")
    included = [item for item in refs if item.startswith("S-")]
    excluded = [item for item in refs if item.startswith("X-")]
    acceptance = [item for item in refs if item.startswith("A-")]
    protected = [item for item in refs if item.startswith("P-")]
    base = {
        "clauseRefs": sorted(refs),
        "evidenceRefs": [],
        "limitations": [
            "This classifies scope only. It is not legal liability, payment, quality, or truthfulness.",
            "Public excerpts are unverified party text.",
        ],
        "reviewStatus": "NONE",
    }
    if atomicity_issue(text):
        return {**base, "classification": "INSUFFICIENT_EVIDENCE", "reasonCode": "NON_ATOMIC_REQUEST", "summary": "The request is not atomic.", "missingEvidence": ["ONE_ATOMIC_REQUEST"]}
    if included and excluded:
        return {**base, "classification": "INSUFFICIENT_EVIDENCE", "reasonCode": "MIXED_SCOPE", "summary": "Included and excluded clauses are both cited.", "missingEvidence": ["DISAMBIGUATE_INCLUDED_OR_EXCLUDED"]}
    evidence_refs: list[str] = []
    if protected:
        missing: set[str] = set()
        for clause_id in protected:
            scenario = known[clause_id]["scenario"].lower()
            pool = [item for item in evidence if str(item.get("scenario", "")).strip().lower() == scenario]
            baseline = next((item for item in pool if item.get("type") == "BASELINE_REPORT"), None)
            post = next((item for item in pool if item.get("type") == "POST_PATCH_REPORT"), None)
            if not baseline:
                missing.add("BASELINE_REPORT")
            if not post:
                missing.add("POST_PATCH_REPORT")
            for item in (baseline, post):
                if not item:
                    continue
                evidence_refs.append(str(item["id"]))
                if _env(str(item.get("environment", ""))) != _env(card["environment"]):
                    missing.add("COMPATIBLE_ENVIRONMENT")
                if not str(item.get("preState", "")).strip():
                    missing.add("PRE_STATE")
                if not str(item.get("postState", "")).strip():
                    missing.add("POST_STATE")
                if not str(item.get("referenceVersion", "")).strip():
                    missing.add("REFERENCE_VERSION")
                if item.get("type") == "PUBLIC_EXCERPT":
                    missing.add("STRUCTURED_REPORT")
        if missing:
            return {
                **base,
                "evidenceRefs": sorted(set(evidence_refs)),
                "classification": "INSUFFICIENT_EVIDENCE",
                "reasonCode": "CAUSATION_NOT_ESTABLISHED",
                "summary": "Protected behavior lacks structured baseline and post-patch evidence. Keywords are not causation.",
                "missingEvidence": sorted(missing),
            }
    if excluded and not included:
        return {**base, "classification": "CHANGE_REQUEST", "reasonCode": "MATCHES_EXCLUDED", "summary": "The request cites excluded work.", "missingEvidence": []}
    if not included or not acceptance:
        missing_bits = []
        if not included:
            missing_bits.append("INCLUDED_CLAUSE")
        if not acceptance:
            missing_bits.append("ACCEPTANCE_CRITERION")
        return {**base, "classification": "INSUFFICIENT_EVIDENCE", "reasonCode": "CLAUSE_REFERENCE_INCOMPLETE", "summary": "In-scope needs an included clause and an acceptance criterion.", "missingEvidence": missing_bits}
    supporting = [
        item
        for item in evidence
        if item.get("type") in ("TEST_REPORT", "POST_PATCH_REPORT")
        and _env(str(item.get("environment", ""))) == _env(card["environment"])
        and str(item.get("scenario", "")).strip()
    ]
    if not supporting:
        return {**base, "classification": "INSUFFICIENT_EVIDENCE", "reasonCode": "MISSING_ADMISSIBLE_EVIDENCE", "summary": "No admissible test or post-patch report.", "missingEvidence": ["TEST_OR_POST_PATCH_REPORT"]}
    ids = sorted({*evidence_refs, *(str(item["id"]) for item in supporting)})
    return {
        **base,
        "evidenceRefs": ids,
        "classification": "IN_SCOPE",
        "reasonCode": "MATCHES_INCLUDED_AND_ACCEPTANCE",
        "summary": "Included clause, acceptance criterion, and admissible evidence agree.",
        "missingEvidence": [],
    }


def assert_time(now: int) -> None:
    if not isinstance(now, int) or now < 1_700_000_000 or now > 4_102_444_800:
        raise PolicyError("TRUSTED_TIME_UNAVAILABLE", "Trusted time is missing or absurd.")


def reject_value(value: int) -> None:
    if int(value) != 0:
        raise PolicyError("VALUE_NOT_ACCEPTED", "PatchScope v1 accepts no value.")
