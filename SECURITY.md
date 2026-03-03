# Security Policy

## Reporting a Vulnerability

Do not open public GitHub issues for undisclosed vulnerabilities.

Preferred reporting path:
- use GitHub private vulnerability reporting or a private security advisory if available for this repository

Fallback:
- contact the maintainer directly through GitHub before public disclosure

Please include:
- affected component
- impact summary
- reproduction steps or proof of concept
- suggested mitigation if known

## Supported Public Surfaces

This policy covers the public ARES codebase, including:
- `contracts/`
- `api/query-gateway/`
- `dashboard/agent-explorer/`
- `sdk/typescript/`
- `sdk/python/`
- `subgraph/`

## Out of Scope for Public Disclosure

Do not use public issues for:
- audit working notes
- launch-day execution materials
- certification packs
- private infrastructure details
- key-management or signer-handling procedures

Those materials are maintained in private operational repositories.

## Disclosure Expectations

Expected process:
- acknowledge receipt within a reasonable window
- validate impact and affected scope
- prepare remediation or compensating controls
- coordinate disclosure after a fix or mitigation exists

Please avoid public disclosure until maintainers confirm that coordinated disclosure can proceed.
