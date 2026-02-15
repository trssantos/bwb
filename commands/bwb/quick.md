---
name: bwb:quick
description: Quick fix/task with full BWB guarantees but condensed into one session
argument-hint: "<description>"
allowed-tools:
  - Read
  - Bash
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<context>
Quick task that runs the full BWB flow in a single condensed session — discussion, contracts, plan, build, and validation all inline. No research step. Same guarantees, smaller scope.
</context>

<objective>
Execute a quick task with contract-driven validation.

**Creates:**
- `.planning/quick/{N}-{slug}/` — task directory with CONTRACTS.md, PLAN.md, SUMMARY.md, VALIDATION.md

**Use for:** Bug fixes, small features, UI tweaks, config changes.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/quick-task.md
</execution_context>

<process>
Execute the quick-task workflow from @/Users/dustbit/.claude/bwb/workflows/quick-task.md end-to-end.
Pass $ARGUMENTS as the task description.
</process>
