import importlib.util
import sys
import types
import unittest


def load_contract():
    gl = types.ModuleType("genlayer")

    class UserError(Exception):
        pass

    error = UserError

    class VM:
        UserError = error

    class Contract:
        pass

    class TreeMap:
        def __class_getitem__(cls, item):
            return dict

    class DynArray(list):
        def __class_getitem__(cls, item):
            return list

    def passthrough(fn):
        return fn

    gl.vm = VM()
    gl.Contract = Contract
    gl.public = types.SimpleNamespace(view=passthrough, write=passthrough)
    gl.message_raw = {}
    gl.message = types.SimpleNamespace(sender_address="0x" + "11" * 20)
    gl.TreeMap = TreeMap
    gl.DynArray = DynArray
    gl.u32 = int
    gl.nondet = types.SimpleNamespace(exec_prompt=lambda prompt: (_ for _ in ()).throw(AssertionError("validator must not call the model")))
    sys.modules["genlayer"] = gl
    import builtins

    builtins.gl = gl
    spec = importlib.util.spec_from_file_location("patchscope_consensus", __file__.replace("test_consensus_bound.py", "patchscope.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, UserError


class ConsensusBoundTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod, cls.UserError = load_contract()

    def gate(self) -> dict:
        return {
            "classification": "IN_SCOPE",
            "reasonCode": "MATCHES_INCLUDED_AND_ACCEPTANCE",
            "clauseRefs": ["A-1", "S-1"],
            "evidenceRefs": ["E-1"],
            "missingEvidence": [],
            "reviewStatus": "NONE",
            "summary": "gate",
            "limitations": ["scope only"],
        }

    def test_constructor_does_not_instantiate_storage_collections(self) -> None:
        with open(__file__.replace("test_consensus_bound.py", "patchscope.py"), encoding="utf-8") as f:
            source = f.read()
        init = source.split("class PatchScope", 1)[1].split("def __init__", 1)[1].split("\n    def ", 1)[0]
        self.assertNotIn("DynArray[", init)
        self.assertNotIn("TreeMap[", init)
        self.assertIn('self.agreement_seq = "0"', init)
        gated = self.gate()
        self.assertTrue(self.mod.accept_leader_payload(gated, gated))
        rewrite = {**gated, "classification": "CHANGE_REQUEST", "reasonCode": "MATCHES_EXCLUDED"}
        self.assertFalse(self.mod.accept_leader_payload(rewrite, gated))
        self.assertFalse(self.mod.accept_leader_payload("not-a-dict", gated))

    def test_model_cannot_relabel_the_gate(self) -> None:
        gated = self.gate()
        record = {"cited": ["S-1", "A-1"], "evidence": [{"id": "E-1"}]}
        rewrite = {
            "classification": "CHANGE_REQUEST",
            "reasonCode": "MATCHES_EXCLUDED",
            "clauseRefs": ["S-1", "A-1"],
            "evidenceRefs": ["E-1"],
            "missingEvidence": [],
            "reviewStatus": "NONE",
            "summary": "relabeled",
        }
        with self.assertRaises(self.UserError):
            self.mod._bounded_model(rewrite, gated, record)
        agreed = {
            "classification": "IN_SCOPE",
            "reasonCode": "MATCHES_INCLUDED_AND_ACCEPTANCE",
            "clauseRefs": ["s-1", "a-1"],
            "evidenceRefs": ["E-1"],
            "missingEvidence": [],
            "reviewStatus": "NONE",
            "summary": "model text",
        }
        self.assertIs(self.mod._bounded_model(agreed, gated, record), gated)


if __name__ == "__main__":
    unittest.main()
