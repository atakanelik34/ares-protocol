# Notes

## Secret Hygiene Warnings

WARNING: Provider/API secrets and infrastructure identifiers were committed in git history during earlier recovery and testnet iterations.

Affected categories include:
- previous Base Sepolia provider RPC URL values
- earlier deployment/recovery infrastructure identifiers

git history is append-only, so removing values from the working tree does not erase prior commits.

If you want full historical scrubbing, use one of:
- `git filter-repo`
- BFG Repo-Cleaner

This warning is intentionally tracked so the repo keeps a visible reminder until history rewriting is explicitly approved and executed.
