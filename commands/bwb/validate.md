---
name: bwb:validate
description: Validate built features against behavioral contracts (6-level check)
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<context>
BWB's validation engine. Checks every FEAT contract through 6 levels: L1 IMPLEMENTED, L2 ACCESSIBLE, L3 FUNCTIONAL, L4 RESILIENT, L5 INTEGRATED, L6 FAITHFUL. Produces VALIDATION.md with per-feature results and GAP entries for failures.
</context>

<objective>
Validate built features against behavioral contracts.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md` (what to validate)
- `.planning/phases/{NN}-{name}/{NN}-CONTEXT.md` (for L6 faithfulness checks)
- `.planning/phases/{NN}-{name}/{NN}-{plan}-SUMMARY.md` (what was built)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-VALIDATION.md`

**After this command:** If gaps found, run `/bwb:fix {phase}`. If passed, move to next phase.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/validate-phase.md
</execution_context>

<process>
Execute the validate-phase workflow from @/Users/dustbit/.claude/bwb/workflows/validate-phase.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
