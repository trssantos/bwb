---
name: bwb:discuss
description: Gather phase context through adaptive questioning (with research context)
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---
<context>
Extract implementation decisions for a phase. Reads RESEARCH.md findings to ask informed questions. Captures decisions in CONTEXT.md for downstream contract extraction.

Discussion happens AFTER research in BWB. Research findings inform the questions — "Research found library X has limitation Y — how should we handle this?"
</context>

<objective>
Capture implementation decisions through focused discussion.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-RESEARCH.md` (from `/bwb:research`)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-CONTEXT.md`

**After this command:** Run `/bwb:contracts {phase}` to extract behavioral contracts.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/discuss-phase.md
</execution_context>

<process>
Execute the discuss-phase workflow from @/Users/dustbit/.claude/bwb/workflows/discuss-phase.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
