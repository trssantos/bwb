---
name: bwb:progress
description: Check project progress, show context, and route to next action
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---
<context>
Check project progress, display current state, and route to the correct next action based on where the project is in the BWB flow.
</context>

<objective>
Show project progress and route to next action.

**Reads:**
- `.planning/STATE.md` — current position
- `.planning/ROADMAP.md` — phase structure
- `.planning/PROJECT.md` — project context

**Routes to:** The appropriate next BWB command based on current state.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/progress.md
</execution_context>

<process>
Execute the progress workflow from @/Users/dustbit/.claude/bwb/workflows/progress.md end-to-end.
</process>
