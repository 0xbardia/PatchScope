# 04 Studio reads

Deploy: not performed. No signer and no contract address. A deploy transaction was not scripted.

Schema read (not a deployed call), `gen_getContractSchemaForCode` against `https://studio.genlayer.com/api` on the current `patchscope.py`:

| Method | Schema | Storage call | Result |
| --- | --- | --- | --- |
| get_policy | readonly, no params | not called | FAIL — no address |
| get_agreement | readonly, `agreement_id` | not called | FAIL — no address |
| list_agreements | readonly, `cursor`, `limit` | not called | FAIL — no address |
| get_case | readonly, `case_id` | not called | FAIL — no address |
| list_cases | readonly, `cursor`, `limit` | not called | FAIL — no address |
| get_packet | readonly, `case_id` | not called | FAIL — no address |
| get_decision | readonly, `case_id` | not called | FAIL — no address |

Source SHA-256 after the judge fixes, schema-checked again (`gen_getContractSchemaForCode`, all seven reads `readonly`, 15 writes): `b80081f12b9eef779bfb08193427ff99b4a4547714a53d0cd06f2b0986aa990c`.
Constructor args: none.
Deploy tx: none.
