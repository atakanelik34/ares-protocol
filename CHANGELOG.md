# Changelog

All notable public repository changes are documented here.

## [0.1.0] - 2026-03-03

### Added
- public TypeScript SDK surface under `@ares-protocol/sdk`
- CONTRIBUTING, SECURITY, CODEOWNERS, PR template, and structured issue forms
- public docs validation and tracked-surface guard scripts
- GitHub release workflows for repo milestones and the TypeScript SDK

### Changed
- public repository repositioned around the protocol core, explorer, API, SDKs, subgraph, and public docs
- README rewritten for public onboarding and current testnet-live status
- docs hubs limited to the core public document set
- CI split into contracts, node surfaces, docs validation, and secret scanning

### Fixed
- Foundry dependency bootstrap moved to a dedicated script
- public branch no longer tracks protocol-admin or internal docs packs
- deploy and smoke-test references no longer write proof artifacts into public docs paths

### Security
- public/private contribution boundary documented
- security disclosure path documented
- secret scanning added to GitHub Actions

### Docs
- public docs hub copy updated to point private operational materials out of the public repository
- roadmap and Base/CDP docs no longer deep-link internal execution material
