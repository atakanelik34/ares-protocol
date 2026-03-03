# Contributing

## Scope

ARES Protocol is a public monorepo for the protocol core, API, explorer, SDKs, subgraph, and public documentation.

Public contributions are welcome for:
- contracts and tests
- API behavior
- explorer UX and reliability
- SDK improvements
- public docs and examples
- CI and developer tooling

Do not use the public repository for:
- launch-day execution packs
- audit working papers
- certification artifacts
- private operational runbooks
- investor or business materials

Detailed launch and operational materials are maintained in private operational repositories.

## Local Setup

Prerequisites:
- Node.js 22+
- npm 10+
- Foundry stable

Install dependencies:

```bash
npm ci
bash ./scripts/contracts/bootstrap.sh
```

Recommended local checks:

```bash
forge test --root ./contracts
npm --workspace api/query-gateway test
npm --workspace dashboard/agent-explorer run build
npm --workspace sdk/typescript run build
```

## Branch Naming

Use `codex/` or another short descriptive prefix for feature branches.

Examples:
- `codex/fix-api-timeout`
- `codex/docs-tokenomics-update`

Do not work directly on `main`.

## Commit Format

Use Conventional Commits:
- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `chore:`
- `security:`

Examples:
- `fix: tighten SSE reconnect handling`
- `docs: simplify public docs hub`
- `feat(sdk): add Python pagination helpers`

## Test Expectations By Area

Contracts:
- run `forge test --root ./contracts`

API:
- run `npm --workspace api/query-gateway test`

Explorer:
- run `npm --workspace dashboard/agent-explorer run build`

SDK:
- run `npm --workspace sdk/typescript run build`

Docs-only changes:
- verify public links and landing/docs consistency

If your change spans multiple areas, run all relevant checks.

## Pull Request Expectations

Every PR should include:
- a short summary
- scope of change
- screenshots for UI work
- test evidence
- rollout notes if production behavior changes
- docs impact

Keep PRs focused. Large mixed-scope PRs slow review and make rollback harder.

## Public/Private Boundary Rules

Do not commit or reintroduce:
- `docs/audit/**`
- `docs/certification/**`
- `docs/launch/**`
- `docs/rehearsal/**`
- `docs/demo/**`
- `docs/submission/**`
- internal status trackers
- generated contract outputs
- SDK build outputs
- `.forensics/`, `tmp/`, `output/`
- pitch decks and investor materials

If a change requires private operational context, summarize only the public-safe outcome in this repo.

## Generated and Ignored Artifacts

Do not commit:
- `contracts/lib/**`
- `contracts/out/**`
- `contracts/cache/**`
- `sdk/typescript/dist/**`
- `landing-assets/**`
- internal execution artifacts already covered by `.gitignore`

If a generated file appears in your diff unexpectedly, stop and check whether it belongs in source control.
