---
name: bwb:baseline
description: Analyze existing codebase and create Phase 00 legacy baseline contracts
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - Glob
  - Grep
  - AskUserQuestion
---
<context>
Brownfield baseline extraction. Analyzes existing codebase to discover features, extracts behavioral contracts, and creates Phase 00 for regression safety. Works with the existing /bwb:validate pipeline.
</context>

<objective>
Analyze an existing codebase and create Phase 00 baseline contracts.

**Creates:**
- `.planning/phases/00-baseline/00-CONTRACTS.md` (behavioral contracts for existing features)

**Updates:**
- `.planning/ROADMAP.md` (inserts Phase 00 at top)
- `.planning/STATE.md` (records baseline session)

**After this command:** Run `/bwb:validate 0` to verify baseline, or continue with Phase 1 work.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/baseline-phase.md
</execution_context>

<process>
Execute the baseline-phase workflow from @/Users/dustbit/.claude/bwb/workflows/baseline-phase.md end-to-end.
</process>
