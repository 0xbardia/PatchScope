# Studio deployment

Deployed to Studionet after the constructor stopped instantiating `DynArray` and `TreeMap`. GenVM zero-initializes those fields. Calling `DynArray[str]()` raised `TypeError: this class can't be instantiated by user`, and that first transaction did not leave a readable contract.

| Item | Value |
| --- | --- |
| Network | Studionet |
| App | https://studio.genlayer.com/contracts |
| Chain ID | 61999, confirmed with `eth_chainId` → `0xf22f` |
| RPC | https://studio.genlayer.com/api |
| Contract file | EchoTrace/contracts/patchscope.py |
| Source SHA-256 | 30f59a5ea57a557ccd0dcc5e2e4dde2c3929d4646e9af6ca80cfce4b8505bcaf |
| Byte count | 42706 |
| Constructor args | none |
| Transaction value | 0 |
| Deploy tx | 0x4708be83a0fd7d6b015b81b2656dc14673b5e87fe6d0c36af9717d47946e2f4f |
| Status | ACCEPTED, MAJORITY_AGREE |
| Contract address | 0x7aFa58C5CF4E0145Bbb8B9C508036EeBc349C2Df |
| Runtime pin | `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` |
| Failed constructor tx | 0x053ba6045893e50c22da36652b9767538ce0aa78d17f3f13c2c0b6504dfde991 |

## Reads after deploy

| Method | Input | Result |
| --- | --- | --- |
| get_policy | none | JSON, version patchscope-v1.0.0, payments false, webImport false |
| list_agreements | cursor `""`, limit 10 | `{"items": [], "nextCursor": ""}` |
| list_cases | cursor `""`, limit 1 | empty page |
| get_agreement | `agr-missing` and `""` | execution reverted |
| get_case | `case-missing` | execution reverted |
| get_packet | `case-missing` | execution reverted |
| get_decision | `case-missing` | execution reverted |
| list_agreements | limit 0 | execution reverted. The source raises `BAD_LIMIT`; the RPC did not return that text |
| list_cases | unknown cursor | execution reverted. The source raises `BAD_CURSOR`; the RPC did not return that text |

No write method was called after deployment. The frontend journey remains the local preview and does not send these transactions.