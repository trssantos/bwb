---
name: bwb:contracts
description: Extract behavioral contracts from discussion context and research
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - AskUserQuestion
---
<context>
BWB's signature workflow. Transforms discussion decisions and research findings into behavioral feature contracts (FEAT entries). Each FEAT has acceptance criteria that become the validation target.

Contracts are behavioral and technology-agnostic: "User can save draft" not "AsyncStorage.setItem called."
</context>

<objective>
Extract behavioral contracts from phase context.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-CONTEXT.md` (from `/bwb:discuss`)
- `.planning/phases/{NN}-{name}/{NN}-RESEARCH.md` (from `/bwb:research`)
- `.planning/ROADMAP.md` (phase goal + success criteria)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md`

**After this command:** Run `/bwb:plan {phase}` to create implementation plans mapped to contracts.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/extract-contracts.md
</execution_context>

<process>
Execute the extract-contracts workflow from @/Users/dustbit/.claude/bwb/workflows/extract-contracts.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
