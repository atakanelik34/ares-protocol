# Repository Settings Checklist

Recommended GitHub repository settings for the public ARES repo:

## Labels

- `area:contracts`
- `area:api`
- `area:explorer`
- `area:sdk`
- `area:subgraph`
- `area:docs`
- `type:bug`
- `type:feature`
- `type:docs`
- `type:security`
- `status:blocked`
- `status:needs-repro`
- `good first issue`
- `help wanted`

## Branch Protection

Protect `main` with:
- at least 1 required review
- stale review dismissal on new commits
- branch must be up to date before merge
- linear history enabled
- force pushes disabled
- branch deletion disabled

Required checks after CI wave rollout:
- `CI / contracts`
- `CI / apps`

## Feature Posture

- Issues: enabled
- Discussions: disabled initially
- Wiki: disabled
- Releases: enabled
- Packages: enabled
- Security advisories: enabled

## Public/Private Boundary

Do not reintroduce internal operational content into the public repository.

Examples that stay private:
- audit packs
- certification packs
- launch-day materials
- rehearsal artifacts
- submission artifacts
- internal master status trackers
