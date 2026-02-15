---
name: bwb:build
description: Execute plans with wave-based parallelization and coherence checks
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Edit
  - Task
  - AskUserQuestion
---
<context>
Execute all PLAN.md files in a phase using wave-based parallelization. Each plan is executed by a bwb-builder agent. After each wave, coherence is checked against CONTRACTS.md.
</context>

<objective>
Execute implementation plans with atomic commits.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-{plan}-PLAN.md` (plans to execute)
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md` (for coherence checks)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-{plan}-SUMMARY.md` (per plan)

**After this command:** Run `/bwb:validate {phase}` to check features against contracts.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/build-phase.md
</execution_context>

<process>
Execute the build-phase workflow from @/Users/dustbit/.claude/bwb/workflows/build-phase.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
