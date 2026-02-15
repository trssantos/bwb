---
name: bwb:research
description: Research how to implement a phase — spawns bwb-researcher agent
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Task
  - AskUserQuestion
---
<context>
Research how to implement a phase before discussion. Spawns bwb-researcher agent with phase context from ROADMAP.md and PROJECT.md.

Research happens BEFORE discuss in BWB. The researcher gets the phase goal and project context (not CONTEXT.md, which doesn't exist yet). Output: RESEARCH.md.
</context>

<objective>
Research implementation approach for a phase. Spawns bwb-researcher agent.

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-RESEARCH.md`

**After this command:** Run `/bwb:discuss {phase}` to capture decisions with research context.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/research-phase.md
</execution_context>

<process>
Execute the research-phase workflow from @/Users/dustbit/.claude/bwb/workflows/research-phase.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
