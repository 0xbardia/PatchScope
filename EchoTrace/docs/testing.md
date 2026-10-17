# Testing

## What passed here

- `node --experimental-strip-types --test src/lib/patchscope/policy.test.ts`
- `python3 -m unittest EchoTrace/contracts/test_policy_core.py`
- `npm run typecheck`
- `npm run build`
- Production smoke on the built app: no page errors, no horizontal overflow at 1280 and 390
- A manual browser pass through the visible controls for acceptance, freeze, both classifications, and a change order
- Injected-wallet browser journey, separate from the demo personas: two disposable keys signed `personal_sign` through the visible Connect and “Use as” controls. Developer `0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A` recorded agreement `agr-dcf33730`. Client `0x1563915e194D8CfBA1943570603F7606A3115508` accepted it and opened challenge case `case-973aa9ec`. No contract transaction was sent. This is not a funded Studionet receipt and not a manual MetaMask prompt.

## What did not pass because it did not run

Direct Mode. `pip install genlayer-test` resolved to 0.1.2, whose API is an RPC client (`gltest`) without `direct_deploy` or `mock_llm`. Current docs require Python >= 3.12. A fake `gl` module was not used as Direct Mode evidence.

Studio Mode was not run. No deployment transaction was sent.

Playwright was not repeated as a three-engine CI job in this pass. The smoke tool covered Chromium desktop and mobile. Firefox and WebKit were not executed here.
