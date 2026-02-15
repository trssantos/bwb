---
name: bwb:init
description: Onboard an existing project (brownfield) — detect stack, create .planning/
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<context>
Brownfield onboarding for existing projects without `.planning/`. Detects tech stack, scans structure, and sets up BWB tracking.
</context>

<objective>
Onboard an existing project for BWB tracking.

**Creates:**
- `.planning/PROJECT.md` — from codebase analysis + Q&A
- `.planning/config.json` — workflow preferences
- `.planning/ROADMAP.md` — initial phase for what user wants to do
- `.planning/STATE.md` — project memory

**After this command:** Run `/bwb:add` to add phases, or `/bwb:research 1` to begin.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/init-project.md
@/Users/dustbit/.claude/bwb/templates/project.md
@/Users/dustbit/.claude/bwb/templates/roadmap.md
@/Users/dustbit/.claude/bwb/templates/state.md
</execution_context>

<process>
Execute the init-project workflow from @/Users/dustbit/.claude/bwb/workflows/init-project.md end-to-end.
</process>
