---
name: bwb:resume
description: Resume work from previous session with full context restoration
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---
<context>
Resume work on a BWB project from a previous session. Loads STATE.md for full context restoration and routes to the correct next action.
</context>

<objective>
Restore project context and resume where you left off.

**Reads:**
- `.planning/STATE.md` — position, decisions, blockers
- `.planning/PROJECT.md` — project overview
- `.planning/ROADMAP.md` — phase structure

**Routes to:** The appropriate next BWB command.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/resume-project.md
</execution_context>

<process>
Execute the resume-project workflow from @/Users/dustbit/.claude/bwb/workflows/resume-project.md end-to-end.
</process>
