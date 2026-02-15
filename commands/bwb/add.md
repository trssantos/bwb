---
name: bwb:add
description: Add a new phase to an existing project's roadmap
argument-hint: "[description]"
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---
<context>
Add a new phase to an existing project. Creates the phase entry in ROADMAP.md and phase directory.
</context>

<objective>
Add a new phase to the project roadmap.

**Updates:**
- `.planning/ROADMAP.md` — new phase entry with goal and success criteria
- `.planning/phases/{NN}-{name}/` — new phase directory

**After this command:** Run `/bwb:research {phase}` to begin the full flow.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/add-phase.md
</execution_context>

<process>
Execute the add-phase workflow from @/Users/dustbit/.claude/bwb/workflows/add-phase.md end-to-end.
</process>
