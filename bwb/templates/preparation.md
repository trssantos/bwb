# Preparation Template

Template for `.planning/phases/XX-name/{phase}-PREPARATION.md` — dependency preparation and mock setup for validation.

<template>

```markdown
---
phase: XX-name
prepared_at: YYYY-MM-DDTHH:MM:SSZ
status: ready | pending_items
auto_setup_count: N
external_deps_count: N
mocked_count: N
configured_count: N
pending_count: N
---

# Phase [X]: [Name] — Preparation Report

## Summary

[2-3 sentences. What was discovered, what was set up, what needs attention.]

## Auto-Setup Completed

| Action | Details | Status |
|--------|---------|--------|
| [action type] | [what was done] | Done |

## Environment Variables

| Variable | Purpose | Status | Used By |
|----------|---------|--------|---------|
| [VAR_NAME] | [what it's for] | [Mocked/Configured/Pending/Auto] | [FEAT-NN list] |

## External Dependencies

### Configured (Real)

| Service | Credentials | Verified | FEATs |
|---------|------------|----------|-------|
| [service] | [what was set] | [Yes/No] | [FEAT-NN list] |

### Mocked

| Service | Fixtures | Mock Client | FEATs |
|---------|----------|-------------|-------|
| [service] | [fixture path] | [client stub path or N/A] | [FEAT-NN list] |

### Pending

| Service | Reason | Affected FEATs |
|---------|--------|----------------|
| [service] | [why pending] | [FEAT-NN list] |

## Mock Manifest

See `test/mocks/manifest.json` for complete mock inventory.

[Omit this section if no mocks were generated.]

## Validation Readiness

| FEAT | Status | Dependencies | Notes |
|------|--------|--------------|-------|
| [FEAT-NN] | [Ready (mocked)/Ready (real)/Ready (no deps)/Pending] | [dep list] | [brief note] |

## Remaining Manual Steps

[List any steps the user needs to take manually, or "None — all dependencies resolved."]
```

</template>

<guidelines>

**Status values:**
- `ready` — All dependencies resolved (configured, mocked, or not needed). Validation can run fully.
- `pending_items` — Some dependencies skipped. Validation will flag affected FEATs.

**Environment variable statuses:**
- `Configured` — Real value set in .env
- `Mocked` — Using mock fixtures instead of real service
- `Auto` — Auto-configured (e.g., local DB path)
- `Pending` — Not configured, user chose to skip

**Validation readiness statuses:**
- `Ready (mocked)` — Dependencies mocked, logic testable via fixtures
- `Ready (real)` — Real credentials configured and verified
- `Ready (no deps)` — Feature has no external dependencies
- `Pending` — Dependencies not resolved, will be flagged in validation

**Mock fixture conventions:**
- Fixtures go in `test/mocks/{service}/` (or follow existing test conventions)
- Each service gets success, error, and empty response fixtures
- `manifest.json` at the mock root lists all mocks with metadata
- Mock client stubs match the real client's interface for methods used

**Auto-setup scope:**
- Install packages
- Create directories
- Generate .env.example
- Create config templates
- Initialize local databases
- NEVER modify existing source code

</guidelines>
