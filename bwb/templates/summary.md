# Summary Template

Template for `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md` — plan completion documentation.

<template>

```markdown
---
phase: XX-name
plan: YY
type: execute
subsystem: [primary category]
tags: [searchable tech keywords]
contracts_addressed: [FEAT-01, FEAT-03]

provides:
  - [what this plan built/delivered]
affects: [list of areas that will need this context]

key-files:
  created: [important files created]
  modified: [important files modified]

key-decisions:
  - "Decision 1"

patterns-established:
  - "Pattern 1: description"

duration: Xmin
completed: YYYY-MM-DD
---

# Phase [X] Plan [YY]: [Name] Summary

**[Substantive one-liner describing outcome]**

## Performance
- **Duration:** [time]
- **Tasks:** [count completed]
- **Files modified:** [count]

## Accomplishments
- [Most important outcome]
- [Second key accomplishment]

## Contract Coverage
| Contract | Status | Evidence |
|----------|--------|----------|
| FEAT-01 | Addressed | [Brief evidence] |
| FEAT-03 | Addressed | [Brief evidence] |

## Task Commits

1. **Task 1: [task name]** - `hash`
2. **Task 2: [task name]** - `hash`

## Files Created/Modified
- `path/to/file.ts` - What it does

## Decisions & Deviations
[Key decisions or "None — followed plan as specified"]

## Next Plan Readiness
[What's ready for next plan or phase]

---
*Phase: XX-name*
*Completed: [date]*
```

</template>

<guidelines>

**Frontmatter:**
- `contracts_addressed: [FEAT-01, FEAT-03]` — which contracts this plan addressed
- `type` — matches plan type (execute, fix, quick)
- Enables automatic context assembly for future planning

**One-liner:**
- Must be substantive: "JWT auth with refresh rotation using jose library"
- NOT: "Phase complete" or "Authentication implemented"

**Contract Coverage:**
- Maps each addressed contract to evidence
- Evidence is brief — full validation happens in `/bwb:validate`

</guidelines>
