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
Automated fix cycle for validation gaps. Reads GAPs from VALIDATION.md, creates targeted fix plans, executes them, and re-validates affected FEATs. Max 3 iterations before escalating.
</context>

<objective>
Fix validation gaps from /bwb:validate.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-VALIDATION.md` (gaps to fix)
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md` (acceptance criteria)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-fix-{N}-PLAN.md` (fix plans)
- `.planning/phases/{NN}-{name}/{NN}-fix-{N}-SUMMARY.md` (fix results)
- Updates VALIDATION.md with new results

**After this command:** Re-validates. If gaps remain, offers another cycle (max 3). If passed, phase complete.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/fix-loop.md
</execution_context>

<process>
Execute the fix-loop workflow from @/Users/dustbit/.claude/bwb/workflows/fix-loop.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
