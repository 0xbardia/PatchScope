# Configuration

`.env.example` lists the variables. `scripts/bootstrap.sh` copies it to `.env` only if `.env` is absent, writes a random `SESSION_SECRET`, and does not print the secret.

`VITE_` variables are public build-time browser configuration. Do not put secrets in them.

Empty contract address and empty RPC are valid. The app then stays in the local workspace and says so. Do not fill `VITE_WALLETCONNECT_PROJECT_ID` with a placeholder.

The contract cannot read these variables. Policy version and hash are constants in source.
