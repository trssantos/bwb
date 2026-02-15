---
name: bwb:plan
description: Create implementation plans mapped to behavioral contracts
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<context>
Create executable PLAN.md files for a phase. Plans are mapped to CONTRACTS.md — every FEAT must be covered by at least one plan. Plans are prompts, not documents that become prompts.
</context>

<objective>
Create implementation plans mapped to contracts.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md` (behavioral contracts)
- `.planning/phases/{NN}-{name}/{NN}-RESEARCH.md` (tech approach)
- `.planning/phases/{NN}-{name}/{NN}-CONTEXT.md` (decisions)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-{plan}-PLAN.md` (one or more plan files)

**After this command:** Run `/bwb:build {phase}` to execute the plans.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/plan-phase.md
</execution_context>

<process>
Execute the plan-phase workflow from @/Users/dustbit/.claude/bwb/workflows/plan-phase.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
