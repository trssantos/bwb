# Contracts Template

Template for `.planning/phases/XX-name/{phase}-CONTRACTS.md` — behavioral feature specifications.

<template>

```markdown
---
phase: XX-name
created: YYYY-MM-DD
status: draft | approved
contract_count: N
source_decisions: N
source_criteria: N
---

# Phase [X]: [Name] — Feature Contracts

## Overview

[1-2 sentences describing what this phase delivers and how contracts were derived]

**Derived from:**
- CONTEXT.md: [N] locked decisions
- ROADMAP.md: [N] success criteria
- RESEARCH.md: [N] feasibility notes

## Contracts

### FEAT-01: [Title]
**What:** [What this feature/behavior provides — one sentence]
**Expected:** [What should happen when a user triggers this — observable outcome]
**Acceptance:** [Concrete, testable criterion — how we know it works]
**Source:** [Which decision or success criterion this derives from]
**Depends:** [FEAT-XX or "None"]

### FEAT-02: [Title]
**What:** [Description]
**Expected:** [Observable outcome]
**Acceptance:** [Testable criterion]
**Source:** [Decision/criterion reference]
**Depends:** [Dependencies or "None"]

[... additional FEAT entries ...]

## Coverage

| Source | Item | Contract |
|--------|------|----------|
| Decision: [X] | [Decision summary] | FEAT-01 |
| Criterion: [Y] | [Success criterion] | FEAT-02, FEAT-03 |

## Notes

[Any feasibility notes from research, implementation guidance, or scope boundaries]
```

</template>

<guidelines>

**What contracts ARE:**
- Behavioral specifications — what the feature DOES, not how it's built
- Technology-agnostic — "User can save draft" not "AsyncStorage.setItem called"
- Observable — can be verified by reading code or running the feature
- Derived from decisions (CONTEXT.md) and success criteria (ROADMAP.md)

**What contracts are NOT:**
- Implementation plans (that's PLAN.md)
- Test cases (though they inform testing)
- Code specifications (no file paths, no function signatures)

**FEAT-{N} format:**
- Sequential within a phase: FEAT-01, FEAT-02, ...
- Each FEAT maps to ONE observable behavior
- If a decision implies multiple behaviors, split into multiple FEATs
- Dependencies between FEATs are explicit

**Coverage:**
- Every locked decision from CONTEXT.md must map to at least one FEAT
- Every success criterion from ROADMAP.md must map to at least one FEAT
- Coverage table makes gaps visible

**Acceptance criteria:**
- Must be verifiable by reading code (static analysis)
- "User can X" → check that the code path from entry point to X is complete
- "Data persists after Y" → check that save/load cycle is implemented
- "Error shown when Z" → check that error handling exists for Z condition

**Lifecycle:**
1. Created during `/bwb:contracts` from CONTEXT.md decisions + ROADMAP.md criteria
2. Reviewed and approved by user (interactive)
3. Referenced in PLAN.md frontmatter: `contracts: [FEAT-01, FEAT-03]`
4. Validated during `/bwb:validate` — each FEAT checked through 6 levels
5. Gaps identified in VALIDATION.md reference specific FEAT IDs

</guidelines>
