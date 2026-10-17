# Deployment

Do not script a Studio deployment.

1. Recompute the SHA-256 of `contracts/patchscope.py`.
2. Update `docs/DEPLOY_APPROVAL.md` if the hash moved.
3. A person reviews the file, network, constructor (none), and value (0).
4. That person signs in Studio.
5. Only then set the returned address. Do not invent a receipt.

The application itself is the TanStack app at the repository root. Marketing pages do not load the wallet module until a workspace route does.
