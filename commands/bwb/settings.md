---
name: bwb:settings
description: Configure BWB workflow settings — model profile, fix loop behavior
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Interactive configuration of BWB workflow settings via multi-question prompt.

Routes to the settings workflow which handles:
- Config existence ensuring
- Current settings reading and parsing
- Interactive 3-question prompt (model profile, fix max iterations, fix auto-retry)
- Config merging and writing
- Confirmation display
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/settings.md
</execution_context>

<process>
**Follow the settings workflow** from `@/Users/dustbit/.claude/bwb/workflows/settings.md`.

The workflow handles all logic including:
1. Config file creation with defaults if missing
2. Current config reading
3. Interactive settings presentation
4. Answer parsing and config merging
5. File writing
6. Confirmation display
</process>
