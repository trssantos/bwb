---
name: bwb:fix
description: Fix validation gaps with targeted fix plans and re-validation
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
Automated fix cycle for validation gaps. Reads GAPs from VALIDATION.md, creates targeted fix plans, executes them, and runs FULL re-validation (all contracts — catches regressions). Loops automatically until clean or max iterations reached. Configurable via /bwb:settings.
</context>

<objective>
Fix validation gaps from /bwb:validate.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-VALIDATION.md` (gaps to fix)
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md` (acceptance criteria)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-fix-{N}-PLAN.md` (fix plans)
- `.planning/phases/{NN}-{name}/{NN}-fix-{N}-SUMMARY.md` (fix results)
- Replaces VALIDATION.md with fresh full re-validation each iteration

**Behavior:**
- Auto-retry: loops automatically, fixing ALL gaps each iteration (default)
- Full re-validation: validates ALL contracts each iteration (catches regressions)
- Configurable: max iterations (default 5) and auto-retry toggle via `/bwb:settings`
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/fix-loop.md
</execution_context>

<process>
Execute the fix-loop workflow from @/Users/dustbit/.claude/bwb/workflows/fix-loop.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
