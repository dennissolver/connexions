# Connexions Lifecycle Law (Immutable)

## Single Source of Truth
- Lifecycle is the ONLY authority for navigation
- Pages do NOT redirect arbitrarily
- Orchestrators do NOT route users

## Invariants
- New clients have ZERO data
- Zero data is VALID
- Undefined is NEVER valid

## Enforcement
- All routing uses resolveNextRoute()
- All dashboards return defaults
- All PRs violating this are rejected
