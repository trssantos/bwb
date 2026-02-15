---
name: bwb:new
description: Initialize a new project with deep context gathering, research, and roadmap
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<context>
Initialize a new BWB project through unified flow: questioning → research → PROJECT.md → ROADMAP.md → STATE.md.
</context>

<objective>
Initialize a new project through deep questioning, research, and structured planning.

**Creates:**
- `.planning/PROJECT.md` — project context and requirements
- `.planning/config.json` — workflow preferences
- `.planning/ROADMAP.md` — phase structure with success criteria
- `.planning/STATE.md` — project memory

**After this command:** Run `/bwb:research 1` to begin the first phase.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/new-project.md
@/Users/dustbit/.claude/bwb/templates/project.md
@/Users/dustbit/.claude/bwb/templates/roadmap.md
@/Users/dustbit/.claude/bwb/templates/state.md
</execution_context>

<process>
Execute the new-project workflow from @/Users/dustbit/.claude/bwb/workflows/new-project.md end-to-end.
Preserve all workflow gates (validation, approvals, commits, routing).
</process>
