# Validation Template

Template for `.planning/phases/XX-name/{phase}-VALIDATION.md` — per-feature validation results.

<template>

```markdown
---
phase: XX-name
validated: YYYY-MM-DDTHH:MM:SSZ
status: passed | gaps_found
total_features: N
passing_features: N
gap_count: N
---

# Phase [X]: [Name] — Validation Report

## Summary

[2-3 sentence summary. Lead with pass/fail status.]

**Features validated:** [N]
**Passing:** [P] | **Gaps:** [G]

## Feature Results

| Contract | Title | L1 | L2 | L3 | L4 | L5 | L6 | Result |
|----------|-------|----|----|----|----|----|----|--------|
| FEAT-01 | [Title] | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| FEAT-02 | [Title] | PASS | PASS | FAIL | - | - | - | L3 |

### Validation Levels

- **L1 IMPLEMENTED** — Code exists providing this capability
- **L2 ACCESSIBLE** — Users can reach/trigger this feature
- **L3 FUNCTIONAL** — Implementation logic matches the contract
- **L4 RESILIENT** — Error paths, edge cases, empty states handled
- **L5 INTEGRATED** — Cross-feature dependencies work correctly
- **L6 FAITHFUL** — Implementation matches CONTEXT.md decisions exactly

## Gap Details

### GAP-01: [Title]
- **Contract:** FEAT-02
- **Level:** L3
- **What's wrong:** [Detailed description with file:line references]
- **Expected:** [What the contract says should happen]
- **Actual:** [What the code actually does]
- **Proposed fix:** [Concrete fix with file paths]
- **Files:** [list of files to modify]
- **Scope:** [Small | Medium | Large]

### GAP-02: [Title]
- **Contract:** FEAT-XX
- **Level:** LN
- **What's wrong:** [Description]
- **Expected:** [Expected behavior]
- **Actual:** [Actual behavior]
- **Proposed fix:** [Fix description]
- **Files:** [file list]
- **Scope:** [scope]

## Next Steps

[If passed: Route to next phase]
[If gaps: Route to /bwb:fix]
```

</template>

<guidelines>

**Validation levels (L1-L6):**
Each feature is checked through 6 progressive levels. A failure at any level stops further checks for that feature (the failed level is recorded).

- **L1 IMPLEMENTED:** Glob/Grep for code providing this capability. Not checking specific files — discovering what exists.
- **L2 ACCESSIBLE:** Trace from user entry points to the feature. Is there a route/command/endpoint? Can a user trigger this?
- **L3 FUNCTIONAL:** Read implementation logic. Does it do what the contract says? Check for stubs, placeholders, incomplete logic.
- **L4 RESILIENT:** Check error paths, empty states, edge cases. Does bad input get handled?
- **L5 INTEGRATED:** If FEAT depends on other FEATs, verify integration points. Does data flow correctly?
- **L6 FAITHFUL:** Compare with CONTEXT.md decisions. Does implementation match exactly what was discussed?

**GAP format:**
- GAP-{N} entries are sequential within a validation report
- Each GAP references a specific FEAT and failed level
- Proposed fixes are concrete — file paths, what to change
- Scope helps the fixer agent estimate effort

**Results:**
- PASS = all 6 levels pass
- L{N} = failed at level N
- Features stop at first failure (no point checking L5 if L3 fails)

</guidelines>
