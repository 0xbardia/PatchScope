"""
Authoritative source-linked contract tests for EchoTrace get_relationships canonical return shape.

Authoritative source:
EchoTrace/contracts/echotrace.py

Canonical contract implementation:
    @gl.public.view
    def get_relationships(self, case_id: str) -> str:
        payload = self._peek(case_id)
        if not payload:
            return json.dumps({"found": False, "relationships": []}, sort_keys=True)
        return json.dumps({"found": True, "relationships": payload["relationships"]}, sort_keys=True)
"""

import functools
import json
import os
import sys
import types
import unittest


class MockGL:
    class vm:
        class UserError(Exception):
            pass

    class nondet:
        class web:
            @staticmethod
            def render(url, mode="text"):
                return "Sample render text from " + url

        @staticmethod
        def exec_prompt(prompt, response_format="json"):
            return json.dumps({
                "stance": "primary_reporting",
                "exact_quote": "Sample render text",
                "substantive": True,
                "explanation": "Mocked consensus response"
            })

    class eq_principle:
        @staticmethod
        def prompt_comparative(fn, criteria):
            return fn()

    class message:
        sender_address = "0x1111111111111111111111111111111111111111"

    class public:
        @staticmethod
        def view(fn):
            return fn

        class write:
            def __init__(self, fn):
                self.fn = fn

            def __get__(self, instance, owner):
                if instance is None:
                    return self
                return functools.partial(self.fn, instance)

            def __call__(self, *args, **kwargs):
                return self.fn(*args, **kwargs)

    class Contract:
        pass


def setup_genlayer_mock():
    genlayer_mod = types.ModuleType("genlayer")
    genlayer_mod.gl = MockGL
    genlayer_mod.TreeMap = dict
    genlayer_mod.u32 = int
    genlayer_mod.u256 = int
    for attr in dir(MockGL):
        if not attr.startswith("__"):
            setattr(genlayer_mod, attr, getattr(MockGL, attr))

    sys.modules["genlayer"] = genlayer_mod
    sys.modules["py-genlayer"] = genlayer_mod
    return genlayer_mod


class TestEchoTraceRelationships(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup_genlayer_mock()
        contracts_dir = os.path.dirname(__file__)
        if contracts_dir not in sys.path:
            sys.path.insert(0, contracts_dir)
        import echotrace
        cls.EchoTrace = echotrace.EchoTrace

    def setUp(self):
        self.contract = self.EchoTrace()
        self.contract.requests = {}
        self.contract.cases = {}
        self.contract.case_count = 0

    def test_missing_case_returns_canonical_empty_shape(self):
        """Missing case must return JSON object `{"found": False, "relationships": []}`, NOT bare `[]`."""
        raw_result = self.contract.get_relationships("et-missing-case-id")
        self.assertIsInstance(raw_result, str)
        parsed = json.loads(raw_result)

        self.assertIsInstance(parsed, dict)
        self.assertIn("found", parsed)
        self.assertIn("relationships", parsed)
        self.assertFalse(parsed["found"])
        self.assertEqual(parsed["relationships"], [])

        # Specifically assert that the return payload is NOT a bare array
        self.assertNotEqual(parsed, [])

    def test_populated_case_returns_canonical_populated_shape(self):
        """Populated and sealed case must return `{"found": True, "relationships": [...]}` with full item schema."""
        manifest = {
            "claim": "Example verification claim for canonical relationship mapping.",
            "sources": [
                {"id": "src-1", "url": "https://example.com/one", "role": "submitted", "parentSourceId": None},
                {"id": "src-2", "url": "https://example.com/two", "role": "submitted", "parentSourceId": None},
                {"id": "src-3", "url": "https://example.com/three", "role": "submitted", "parentSourceId": None},
            ],
            "clientRequestId": "req-rel-shape-test-01",
            "parentCaseId": None,
        }
        case_id = self.contract.create_case(json.dumps(manifest))
        self.contract.review_sources_batch(case_id, "b1")
        self.contract.seal_source_reviews(case_id)

        raw_result = self.contract.get_relationships(case_id)
        self.assertIsInstance(raw_result, str)
        parsed = json.loads(raw_result)

        self.assertIsInstance(parsed, dict)
        self.assertTrue(parsed["found"])
        self.assertIsInstance(parsed["relationships"], list)
        self.assertGreater(len(parsed["relationships"]), 0)

        # Verify exact item schema
        for item in parsed["relationships"]:
            self.assertIn("id", item)
            self.assertIn("fromSourceId", item)
            self.assertIn("toSourceId", item)
            self.assertIn("originLabel", item)
            self.assertIn("type", item)
            self.assertIn("supportingEvidenceIds", item)
            self.assertIn("explanation", item)
            self.assertIn("status", item)
            self.assertTrue(item["id"].startswith("rel-"))
            self.assertIsInstance(item["supportingEvidenceIds"], list)

    def test_legacy_bare_array_discrepancy(self):
        """Verifies why bare `[]` from old bytecode is incompatible with the canonical specification."""
        legacy_bytecode_output = "[]"
        parsed_legacy = json.loads(legacy_bytecode_output)
        self.assertIsInstance(parsed_legacy, list)
        # Canonical requires dict with 'found' and 'relationships' keys
        self.assertFalse(isinstance(parsed_legacy, dict))


if __name__ == "__main__":
    unittest.main()
