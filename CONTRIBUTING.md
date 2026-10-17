# Contributing to PatchScope

Thank you for contributing to PatchScope. PatchScope is a decentralized scope-classification system designed to freeze software fix scopes and resolve dispute asks through deterministic gates and GenLayer Intelligent Consensus.

## Guiding Principles

1. **Separation of Concerns**: Keep scope classification strictly separated from payment, liability, escrow, and truthfulness claims.
2. **Deterministic Gating First**: User text and scope descriptions are untrusted. Pre-model validation (clauses, citations, deadlines, evidence requirements) must enforce integrity before LLM validator consensus.
3. **No Centralized Signers**: Never add a backend service or script that holds signing keys or signs user transactions automatically.
4. **Frozen Contract Provenance**: The canonical contract source (`EchoTrace/contracts/patchscope.py`) is deployed on GenLayer Studionet. Any contract modification requires review, redeployment, and verification.

## Development Workflow

### Prerequisites
- Node.js 20+ (recommended v22+)
- Python 3.10+ (for contract unit tests)

### Setup
```bash
# Clone the repository
git clone https://github.com/0xbardia/PatchScope.git
cd PatchScope

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Verification Suite
Run the required verification checks before opening a pull request:

```bash
# Unit & integration tests
npm run test

# TypeScript type check
npm run typecheck

# Code formatting and linting
npm run lint

# Production build
npm run build

# Contract unit tests
python3 -m unittest discover -s EchoTrace/contracts -p "test_*.py"
```

### Guidelines for Changes
- Add unit tests for any new parser, policy logic, or state transition.
- Do not add dependencies that bundle unneeded telemetry or analytics.
- Document any new environment variable in `.env.example`.
- Ensure all public reads and RPC queries handle network timeouts gracefully.
