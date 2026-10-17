"""Not a Studio contract.

The only file to load in GenLayer Studio is patchscope.py.
This name used to be an incomplete copy. Importing it is an error so it cannot be
mistaken for the contract under test.
"""

raise RuntimeError("Do not deploy contract_body.py. Use EchoTrace/contracts/patchscope.py.")
