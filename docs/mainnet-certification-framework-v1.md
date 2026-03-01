# ARES Mainnet Certification Framework v1

Status: Controlled standard for launch certification and external assessment  
Document type: Mainnet certification policy  
Owner: ARES Protocol core team  
Canonical language: English  
Applies to: Base mainnet launch readiness  
Current protocol stage: Testnet-live on Base Sepolia

## Document Control
- Version: `v1.0`
- Classification: controlled operational and security standard
- Intended use: internal launch gating, external auditor onboarding, third-party assessment baseline
- Change authority: ARES core team, governance/launch authority signoff required for launch-affecting changes
- Review cadence: on every launch-critical architecture change and at minimum once per pre-mainnet release cycle

## Intended Audience
This document is written for:
- external auditors
- security reviewers
- protocol engineers
- governance operators
- multisig signers
- launch approvers
- operations owners

It is not written as marketing collateral. It is a controlled assessment baseline.

## Normative Language
The terms `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are used in the RFC-style normative sense.

Interpretation rules:
- `MUST` or `MUST NOT` indicates a launch gate or hard control requirement.
- `SHOULD` or `SHOULD NOT` indicates a strong expectation that may require written exception approval if not followed.
- `MAY` indicates an optional implementation detail that does not affect certification by itself.

## Purpose
This framework defines the hard launch standard for ARES on Base mainnet.
It is not a marketing statement. It is a certification program that maps security, governance, economic safety, operational readiness, and deployment discipline into explicit launch gates.

ARES does not ship to mainnet because it is feature-complete.  
ARES ships to mainnet only when its critical assumptions, invariants, authority paths, and operational controls have been tested, documented, and accepted.

If a required gate is not satisfied, mainnet remains blocked.

Rationale: ARES is not an application. It is a trust primitive for autonomous agents. That requires a stricter launch standard than a conventional frontend-first dApp.

---

## Assessment Independence and Conflict Rules
Any party issuing a certification recommendation or launch-readiness opinion SHOULD be independent from the engineer who implemented the assessed change set.

Minimum separation expectations:
- code author SHOULD NOT be sole approver for the corresponding certification workstream
- launch signoff SHOULD include security, governance, and operations review roles
- any accepted exception MUST identify the approver and residual risk owner
- external audits SHOULD disclose methodology scope, exclusions, and reviewer independence limitations

Rationale: certification loses value if evidence production and acceptance are not separated.

---

## Scope Boundaries and Out-of-Scope Items
This framework covers launch-critical trust, authority, economic, and operational surfaces.

Out of scope unless explicitly added by later revision:
- non-canonical marketing sites or social content
- internal analytics that cannot affect protocol authority or user-visible trust state
- experimental tooling not part of the production path
- future governance modules not included in the frozen launch set

Rule:
Any component outside scope MUST NOT be allowed to silently become launch-critical without a framework revision.

---

## Source-of-Truth Hierarchy
When multiple surfaces disagree, ARES uses the following precedence order:

1. deployed canonical contracts and verified bytecode
2. signed deployment artifacts and role/state reports
3. approved token parameter and governance parameter files
4. subgraph and API derived data
5. explorer, dashboards, docs, and marketing surfaces

Rule:
No lower-priority surface may be treated as authoritative when it conflicts with a higher-priority source.

Rationale: external assessors need a deterministic precedence model for disagreement handling.

---

## Exception Handling and Residual Risk Acceptance
Not all deviations are equal. This framework distinguishes between hard blockers and documented exceptions.

### Allowed exception classes
- bounded operational exception
- bounded tooling limitation
- documented measurement limitation
- temporary non-critical observability gap

### Prohibited exception classes
- mint finality gap
- timelock bypass or unresolved authority ambiguity
- unresolved critical exploit path
- unresolved storage safety issue in upgradeable deployments
- unverifiable production artifact mismatch

Every accepted exception MUST include:
- scope
- justification
- expiry or review date
- residual risk description
- explicit owner
- approver

Rationale: external-grade certification requires structured risk acceptance, not informal waiver language.

---

## Certification Signoff Authority
A final mainnet certification verdict requires signoff across all launch-critical domains.

Minimum signoff set:
- protocol engineering owner
- security owner or external audit lead
- governance authority representative
- operations owner
- launch approver or equivalent executive authority

Rule:
No single role may both produce all evidence and solely authorize final mainnet deployment.

Rationale: launch approval is a joint control process.

---

## Evidence Integrity and Handling Standard
Evidence used for launch certification MUST be reproducible, attributable, and tamper-evident within reasonable operational controls.

Minimum evidence handling rules:
- each artifact SHOULD have an identifier or deterministic path
- generated artifacts SHOULD include generation date and toolchain context
- reports SHOULD reference commit SHA or release tag
- deployment artifacts SHOULD reference verified contract addresses and constructor inputs
- evidence snapshots used for signoff SHOULD be immutable or content-hashed where practical

Rationale: external reviewers must be able to determine whether they are reading the same evidence set that launch approvers accepted.

---

## Dependency and Third-Party Component Policy
ARES relies on audited or widely reviewed upstream components where appropriate, but third-party usage does not transfer risk ownership.

Minimum dependency rules:
- all launch-critical dependencies MUST be pinned to approved versions
- dependency upgrades affecting authority, arithmetic, upgradeability, or token behavior MUST trigger framework review
- third-party adapters, libraries, or infra components MUST be listed in the certification evidence set if they affect launch-critical paths

Rationale: outsourced code is still ARES launch risk once it enters the trusted path.

---
## Certification Model
ARES mainnet certification uses three verdict classes at the workstream level:

- `PASS`: requirement satisfied with current evidence.
- `PASS WITH ASSUMPTIONS`: requirement satisfied only under explicitly documented assumptions or bounded threat models.
- `BLOCKED`: requirement not satisfied; mainnet launch cannot proceed on this basis.

Final launch verdict uses only two outcomes:

- `CERTIFIED FOR MAINNET DEPLOYMENT`
- `MAINNET BLOCKED`

Rules:
- Any `BLOCKED` critical gate blocks mainnet.
- `PASS WITH ASSUMPTIONS` is allowed only if the assumptions are narrow, explicit, and accepted in the launch signoff.
- Undefined assumptions are treated as failures.

Rationale: some properties can be formally or mechanically verified; others can only be certified within bounded economic and operational assumptions.

---

## Scope
This framework covers the full ARES launch surface.

### Layer 1: Core Canonical Authority
- `AresRegistry`
- `AresScorecardLedger`
- `AresARIEngine`
- `AresDispute`
- governance modules
- token authority model and mint finality model

### Layer 2: ERC-8004 Adapter Layer
- identity adapter
- reputation adapter
- validation adapter

### Layer 3: Derived Access Surfaces
- API gateway
- subgraph
- explorer/dashboard
- docs and integration surfaces

### Operations Surface
- GCP runtime
- nginx
- PM2
- monitoring and alerting
- secrets management
- incident response

Formal boundary:
- Core is the only canonical source of truth.
- Adapters may expose compatibility state but cannot override core authority.
- API, subgraph, and explorer are derived views only.
- Off-chain surfaces cannot create canonical state unless validated by the core contracts.

---

## Trust Model
ARES uses an explicit no-implicit-trust model.

### Trusted
- timelock executor
- governor contract
- launch multisig operating under approved threshold and signer policy

### Semi-trusted
- cloud infrastructure
- subgraph/indexer
- API gateway
- explorer frontend
- monitoring stack

### Untrusted
- agents
- challengers
- scorers unless explicitly authorized
- flash liquidity providers
- MEV searchers/builders
- sequencer timing and temporary L2 liveness
- governance whales
- any external relayer
- any frontend consumer

Protocol rule:
No single EOA may unilaterally:
- mint supply
- change critical parameters
- bypass timelock
- slash arbitrary users
- perform unrestricted upgrade
- freeze the system permanently

Rationale: all privileged actions must resolve through explicit, reviewable authority paths.

---

## Assumptions
This certification is valid only under these assumptions unless superseded by later framework versions.

1. Base mainnet is the initial launch environment.
2. Core authority remains separate from ERC-8004 adapter ownership.
3. Token and governance parameters are frozen before launch.
4. Production runtime uses a single clean host or a documented equivalent hardened topology.
5. Contract source and deployed bytecode remain verifier-matched.
6. If a proxy or upgradeable pattern is introduced later, upgrade and storage-layout certification becomes mandatory before launch.
7. Economic certification is bounded: it means no profitable exploit has been found under modeled capital, timing, and liquidity assumptions.

Rationale: security claims without assumptions are not defensible.

---

## System Authority Rules
The following statements must remain true.

1. Core authority cannot be overridden by the adapter layer.
2. Adapter ownership cannot grant canonical operator rights.
3. Derived off-chain views cannot mutate core truth.
4. Timelock is the execution boundary for critical governance changes.
5. Deployer bootstrap privileges must be revoked or rendered inoperative under launch policy.
6. Mint authority must be permanently disabled according to the final token architecture.

Evidence:
- governance state reports
- role matrix
- deployment reports
- revocation proofs

---

## Global State Machine Specification
ARES must be modeled and tested as a deterministic state machine.

### High-level states
- `Bootstrapped`
- `Active`
- `DisputeOpen`
- `DisputeResolved`
- `Slashed`
- `GovernancePending`
- `UpgradePending`
- `Paused`
- `EmergencyMode`

### Required guarantees
- no illegal state transition is reachable
- no terminal frozen state is reachable without explicit recovery path
- dispute lifecycle is deterministic
- no double resolution path exists
- pause is bounded and reversible
- emergency mode cannot become silent permanent shutdown

Evidence:
- state transition spec
- invariant tests
- adversarial sequence tests
- governance lifecycle tests

Rationale: launch safety depends on reachable-state correctness, not only individual function correctness.

---

## Global Mathematical Invariants
All critical invariants must be written as executable tests and, where feasible, formal specifications.

### ARI Engine invariants
- `0 <= ARI <= 1000` at all times
- no overflow or underflow
- no division-by-zero path
- decay remains bounded for all supported horizons
- volume weighting remains bounded
- correction logic cannot produce negative effective state
- repeated update sequences cannot bias score outside intended arithmetic bounds

### Dispute invariants
- slash amount must never exceed available stake
- no double claim
- no double finalize
- reward/slash distribution sums exactly
- no permanent locked-funds state
- griefing cannot halt unrelated protocol activity

### Registry invariants
- agent ID uniqueness
- non-transferability preserved in canonical core
- operator authority remains bounded
- wallet link/unlink rules cannot seize unrelated identities

### Governance invariants
- snapshot-based voting semantics hold
- flash-loan voting cannot satisfy threshold under final configured model
- timelock delay is enforced
- no self-escalation path to unrestricted admin control
- emergency actions are bounded and recoverable

### Upgrade and storage invariants
If any upgradeable path exists, all of the following become mandatory:
- initializer single-use
- implementation lock rules
- no storage collision across approved upgrade graph
- no upgrade path outside timelock plus multisig policy
- no delegatecall-based privilege bypass

### Base/L2 invariants
- bounded timestamp drift does not materially change economic outcomes beyond approved tolerance
- sequencer downtime cannot create unfair dispute expiry under configured safety windows
- no cross-domain or aliasing-based privilege escalation path exists in launch topology

Rationale: invariants are the minimal mathematical truth set of the protocol.

---

## Required Evidence Classes
ARES cannot certify from prose alone. Each critical domain requires evidence artifacts.

### Evidence class A: Formal and declarative specs
- trust model
- role graph
- state machine
- invariant registry

### Evidence class B: Executable tests
- unit tests
- invariant tests
- fuzz tests
- stateful adversarial tests
- fork tests where relevant

### Evidence class C: Economic analysis
- EV models
- griefing cost models
- governance capture cost analysis
- timing and MEV scenario analysis

### Evidence class D: Deployment and ops evidence
- verified contract addresses
- bytecode/artifact match report
- constructor and role assignment report
- monitoring inventory
- incident runbooks

Rationale: a launch claim is valid only when evidence can be inspected independently.

---

## Symbolic Execution, Fuzzing, and Coverage Requirements
Minimum expectations for critical contracts:

- stateful invariant fuzzing on Registry, Ledger, ARI Engine, and Dispute
- boundary-value testing for min/max arithmetic edges
- adversarial sequence testing for dispute and governance workflows
- branch and path coverage targets defined for critical modules
- gas sanity testing on the highest-frequency paths

Target thresholds:
- critical contracts list must be frozen before signoff; minimum expected list: `AresRegistry`, `AresScorecardLedger`, `AresARIEngine`, `AresDispute`, governance contracts, token authority contracts
- coverage tooling must be declared in the certification artifact; preferred measurement is Foundry coverage plus branch-aware supplementary tooling where required
- line coverage target on critical contracts: `>= 95%`
- branch coverage target on critical contracts: `>= 95%` where branch measurement is supported by the selected tooling
- fuzz depth target: `>= 25,000` meaningful iterations per critical entrypoint group

Interpretation rule:
- `where measurable` means the exact toolchain and unsupported branch/path classes are explicitly documented in the artifact
- coverage is necessary but not sufficient
- a 95% coverage result does not override failed invariants or unresolved economic exploits

Required artifact output:
- toolchain used
- frozen critical contract list
- line coverage table
- branch coverage table
- uncovered path justification list

Rationale: coverage is a confidence multiplier, not a substitute for adversarial testing.

---

## Economic Warfare Certification
ARES must be evaluated against rational attackers with different capital profiles.

### Modeled attacker capital sets
- `1 ETH`
- `100 ETH`
- `10,000 ETH`
- effectively unlimited flash liquidity

### Required attack simulations
- dispute spam griefing
- self-recycling challenger loops
- slash rounding arbitrage
- front-run or reorder around dispute resolution
- sybil agent creation
- governance capture scenarios
- timestamp-edge arbitrage
- fee-path exploitation
- MEV reordering around score/dispute flows

### For each scenario, produce
- attacker capital requirement
- required permissions and assumptions
- expected value estimate
- repeatability and sustainability
- time-to-extract
- maximal extractable damage
- blast radius
- mitigation or residual risk

Required output format:
- scenario ID
- attacker profile
- capital range
- dependency assumptions
- EV estimate
- repeatability
- time-to-extract
- maximal extractable damage
- current mitigation status
- final verdict

Certification rule:
Mainnet is blocked if a positive expected value exploit is found under realistic modeled assumptions and economically meaningful scale.

Required wording discipline:
- use `no profitable exploit found under modeled assumptions`
- do not use `impossible` unless mechanically proven

Rationale: ARES is an economic system; exploitability is not only a code property.

---

## Governance Immunity Certification
Governance must be tested as an adversarial system, not assumed safe by design.

### Required claims to validate
- no single whale can unilaterally capture governance under final token distribution assumptions
- no flash-loan amplification can satisfy proposal or execution thresholds under final voting model
- proposal spam cannot DOS governance execution indefinitely
- no parameter rug can bypass timelock and review period
- emergency powers cannot freeze the protocol permanently

### Required tests and reports
- proposal lifecycle smoke and adversarial tests
- threshold analysis against real token allocation plan
- timelock enforcement proofs
- role graph review
- emergency power boundedness report

Verdict format:
- `PASS`
- `PASS WITH ASSUMPTIONS`
- `BLOCKED`

Rationale: governance failure is protocol failure.

---

## Token and Mint Finality Certification
Before mainnet launch, token authority must be final and auditable.

### Mandatory conditions
- one-time mint path executed or provably enforced by architecture
- hard cap preserved
- `MINTER_ROLE` or equivalent mint authority permanently revoked or rendered unreachable
- no upgrade path can reintroduce inflation
- supply invariant proven across final deployment architecture

If mint reactivation remains possible, mainnet is blocked.

Evidence:
- token architecture document
- deployment report
- role renounce/revoke proof
- explorer verification links

Rationale: trust infrastructure cannot launch with ambiguous inflation authority.

---

## Deployment Hardening Certification
Mainnet deployment must be reproducible and reviewable.

### Mandatory checks
- no private keys in repository
- no unsafe broadcast artifacts containing secrets
- no test addresses in production configuration
- compiler version pinned
- constructor parameters recorded
- role assignment matrix recorded
- deployed bytecode matches source artifacts
- all launch contracts verified on public explorer

Required outputs:
- deploy report
- constructor table
- role matrix
- verification proof set

Rationale: deployment discipline is part of protocol security.

---

## Multisig and Timelock Certification
Launch authority must be distributed and delay-enforced.

### Requirements
- multisig threshold `>= 3/5`
- signer diversity documented
- hardware wallet policy documented
- timelock delay `>= 48h`
- no bypass path around timelock for critical actions
- timelock cannot self-bypass into unrestricted execution

### Required simulations
- malicious upgrade attempt
- direct execution bypass attempt
- role-renounce edge cases
- partial signer compromise scenario

Rationale: signer policy is not a formality; it is the final control plane.

---

## Base / L2 Resilience Report
ARES must include a Base-specific launch note.

### Required topics
- worst-case sequencer downtime handling assumptions
- dispute fairness under delayed inclusion
- timestamp drift sensitivity
- censorship assumptions
- finality assumptions for critical economic windows
- simulated sequencer outage test cases
- dispute window behavior under no-inclusion scenario
- explicit timestamp drift tolerance bound
- acceptable economic delta threshold under timing drift

Certification rule:
No known unfair expiry path may remain for dispute-critical actions under documented timing assumptions.

Required artifact output:
- fault scenario matrix
- assumed outage durations
- fairness outcome per dispute path
- timing drift bound and observed score/economic delta
- residual risk statement

Rationale: L2 launch safety depends on timing semantics, not only contract correctness.

---

## Monitoring and Incident Response Certification
Monitoring is a launch requirement, not a post-launch improvement.

### Monitoring baseline
- ARI anomalies
- dispute spikes
- slash spikes
- role changes
- governance proposals and queue state
- API health
- explorer health
- subgraph lag or fallback mode state
- host CPU, memory, and disk
- abuse-event alerts

### Operational SLO baseline
- public landing uptime target
- public explorer uptime target
- API health uptime target
- maximum accepted subgraph lag before fallback state is declared
- alert acknowledgement target per severity
- recovery target for externally visible outage classes

### Incident playbooks must define
- pause authority
- communication template
- hotfix path
- rollback path
- postmortem template
- recovery checklist
- key-compromise procedure
- severity model and escalation path
- fallback behavior if subgraph or chain-dependent surfaces degrade

Certification downgrade rule:
If monitoring exists but is incomplete or unverified, relevant workstream cannot exceed `PASS WITH ASSUMPTIONS`.

Rationale: silent failure is incompatible with trust infrastructure.

---

## Launch Freeze Checklist
All critical launch statements below must be true.

### Governance and authority
- [ ] multisig active and signer policy documented
- [ ] timelock `>= 48h`
- [ ] critical admin roles delegated per launch authority model
- [ ] bootstrap deployer privileges revoked or rendered inoperative

### Security and correctness
- [ ] no open critical findings
- [ ] all high findings fixed or explicitly accepted with signoff
- [ ] critical invariants implemented and passing
- [ ] critical contract coverage target met
- [ ] no unresolved storage or upgrade safety issue

### Economics
- [ ] no profitable exploit found under modeled assumptions
- [ ] governance capture analysis accepted
- [ ] flash-loan voting model accepted
- [ ] dispute griefing cost acceptable

### Token
- [ ] mint finality complete
- [ ] supply model frozen
- [ ] TGE and vesting documents synchronized with implementation

### Operations
- [ ] production monitoring configured
- [ ] alert channel verified
- [ ] incident runbooks finalized
- [ ] recovery drill completed
- [ ] contracts verified on explorer

If any critical checkbox is false, mainnet is blocked.

---

## Workstreams and Deliverables
This framework should be implemented as six linked workstreams.

### Workstream 1: Formal Security Spec
Deliverables:
- trust model
- state machine spec
- invariant registry
- forbidden transition list

### Workstream 2: Executable Security Suite
Deliverables:
- Foundry invariant tests
- fuzz harnesses
- stateful adversarial tests
- storage layout checks where applicable

### Workstream 3: Economic Simulation Pack
Deliverables:
- attacker capital matrix
- EV scenario sheets
- governance capture analysis
- MEV and timing sensitivity report

### Workstream 4: Governance Certification Pack
Deliverables:
- role graph
- timelock proofs
- mint authority finality proof
- proposal lifecycle report

### Workstream 5: Deployment Certification Pack
Deliverables:
- contract address registry
- constructor table
- verification links
- bytecode/artifact report

### Workstream 6: Ops Certification Pack
Deliverables:
- monitoring inventory
- alert inventory
- incident runbook
- recovery closure checklist

Rationale: large launch requirements become auditable only when decomposed into workstreams.

---

## Evidence Artifact Registry
Minimum artifact set expected before mainnet signoff:

- `docs/mainnet-go-no-go.md`
- `docs/security-ops.md`
- governance state reports
- deployment address registry
- explorer verification links
- audit report and remediation matrix
- invariant/fuzz result summary
- economic certification report
- Base/L2 timing assumptions report
- incident response and recovery documents
- signer and custody evidence set
- token and TGE sync evidence set
- final signoff record

Required artifact conventions:
- artifact owner
- generation date
- related commit or release identifier
- related environment
- approval status
- approver if accepted as signoff evidence

Recommendation:
Keep a dedicated `docs/certification/` directory for generated artifacts and signoff records.

---

## Certification Procedure
Mainnet certification proceeds in this order.

1. Freeze protocol surface intended for launch.
2. Freeze dependency set and launch-critical contract list.
3. Lock authority model and role graph.
4. Execute test, fuzz, invariant, and coverage suites.
5. run economic simulations and governance capture analysis.
6. close or explicitly accept all findings under the finding standard.
7. complete deployment rehearsal and verification.
8. publish evidence artifacts and integrity references.
9. verify monitoring, alerts, and incident procedures.
10. run final launch freeze checklist.
11. collect multi-party signoff.
12. issue final verdict.

No final verdict should be issued before all evidence artifacts exist and all required signoff roles have reviewed the accepted evidence set.

---

## Change Control for This Standard
This document is itself a controlled launch artifact.

Change rules:
- any modification affecting a `MUST` requirement requires review before the next launch decision
- scope expansion to new trust-critical components requires explicit revision update
- changes made after evidence generation MUST trigger evidence refresh if they affect the reviewed surface

Rationale: an external-audit-grade standard must not drift silently during launch preparation.

---

## Final Certification Verdict
ARES may be declared certified for mainnet only if all critical gates pass and the final evidence set is complete.

### Final verdict: `CERTIFIED FOR MAINNET DEPLOYMENT`
Allowed only when:
- no critical gate is blocked
- no unresolved profitable exploit remains under accepted assumptions
- governance and mint authority are final
- deployment and ops evidence is complete

### Final verdict: `MAINNET BLOCKED`
Required when any of the following is true:
- critical gate unresolved
- authority model ambiguous
- mint finality incomplete
- timelock or multisig policy incomplete
- monitoring absent or unverified
- exploit analysis unresolved
- external audit closure incomplete

Rationale: the burden of proof for launch is positive evidence, not optimism.

---

## Current Applicability to ARES
At the time of writing, ARES is testnet-live on Base Sepolia and is not yet eligible for a mainnet certification verdict.

Expected current classification:
- architecture model: `PASS`
- core authority separation: `PASS`
- deployment recovery and hardened prod runtime: `PASS`
- monitoring baseline: `PASS WITH ASSUMPTIONS` until verified notification channel and sustained operations review
- token mint finality for mainnet: `BLOCKED`
- external audit closure: `BLOCKED`
- full governance immunity certification: `BLOCKED`
- final mainnet verdict: `MAINNET BLOCKED`

Rationale: this framework is intended to make the remaining blockers explicit, not to imply premature readiness.

---

## Appendix A: Audit Finding Standard
Every security, economic, governance, or operational finding must be recorded using a strict grammar.

### Severity classes
- `CRITICAL`: direct loss of funds, irreversible state corruption, privilege takeover, mint reactivation, timelock bypass, or launch-blocking governance failure
- `HIGH`: economically meaningful exploit, authority boundary break, persistent DOS, or severe integrity failure without immediate total compromise
- `MEDIUM`: bounded exploitability, degraded guarantees, or material hardening weakness with limited blast radius
- `LOW`: minor correctness, observability, ergonomics, or hardening weakness with low exploit value
- `INFO`: informational note, recommendation, or documentation issue

### Required finding record format
- finding ID
- title
- severity
- affected component
- preconditions
- exploit path
- impact statement
- proof or reproduction method
- remediation plan
- fix commit or PR reference
- regression test reference
- final status

### Closure rule
- all `CRITICAL` findings must be closed before launch
- all `HIGH` findings must be fixed or explicitly accepted with written launch signoff
- every fixed finding must link to a regression test or verification artifact

Rationale: audit output must be mechanically reviewable, not narrative-only.

---

## Appendix B: Signer and Key Management Certification
Key management is a separate launch workstream and cannot be treated as a footnote under multisig.

### Required controls
- signer count and threshold documented
- signer geo and entity distribution documented
- hardware wallet requirement documented
- signer identity and device segregation policy documented
- compromised signer playbook documented
- lost signer replacement workflow documented
- emergency rotation authority documented
- key inventory and custody ownership documented

### Certification checks
- no signer controls multiple nominal seats without disclosure
- no hot wallet is used for long-lived governance signing
- signer replacement process does not bypass timelock or threshold policy
- emergency signer rotation cannot silently reduce security threshold

### Required artifacts
- signer matrix
- custody policy
- compromise response runbook
- replacement workflow diagram
- last verification date

Rationale: multisig strength depends on signer operations, not threshold math alone.

---

## Appendix C: Operational SLO and Incident Severity Standard
Operational readiness must be defined numerically enough to support launch review.

### Minimum incident severities
- `SEV-1`: public outage, critical governance/control failure, security incident, or corrupted canonical data path
- `SEV-2`: major degradation of explorer/API, persistent fallback mode, or delayed but material protocol visibility loss
- `SEV-3`: limited feature degradation, monitoring gap, or isolated non-canonical surface issue
- `SEV-4`: minor issue, cosmetic problem, documentation gap

### Minimum operational targets
- define public landing uptime SLO
- define explorer uptime SLO
- define API health uptime SLO
- define maximum accepted subgraph lag
- define alert acknowledgement target by severity
- define incident communication target by severity
- define recovery objective for externally visible outages

### Required runbook outputs
- incident severity rubric
- on-call and acknowledgement expectations
- fallback and failover behavior
- communication templates
- postmortem template with corrective action tracking

Rationale: launch operations are only credible if the team knows what counts as an incident and how fast it must react.

---

## Appendix D: Token and TGE Implementation Sync Standard
Token documentation and implementation must share a canonical source of truth.

### Required artifacts
- canonical token parameter file
- token total supply record
- distribution schedule record
- vesting contract addresses
- treasury wallet registry
- mint revocation proof references
- deployment artifact hash or equivalent integrity reference

### Certification checks
- on-chain allocations reconcile to published tokenomics
- TGE unlock values reconcile to canonical parameter file
- treasury and vesting destinations are frozen and documented
- revocation proofs are linked from the launch report

Rationale: token/TGE ambiguity is a launch blocker even when the contracts themselves are correct.
