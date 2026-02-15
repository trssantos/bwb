# Plan Template

Template for `.planning/phases/XX-name/{phase}-{plan}-PLAN.md`.

<template>

```markdown
---
phase: XX-name
plan: YY
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
contracts: [FEAT-01, FEAT-03]
---

# Phase [X] Plan [YY]: [Title]

## Objective
- **What:** [What this plan builds]
- **Why:** [Why it matters for the phase goal]
- **Output:** [Concrete deliverable]
- **Contracts:** [Which FEAT entries this plan satisfies]

## Context

@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/XX-name/XX-CONTRACTS.md

## Tasks

<task type="code">
  <name>[Task name]</name>
  <files>[file paths]</files>
  <action>[What to do — detailed enough to execute without ambiguity]</action>
  <verify>[How to verify this task is complete]</verify>
  <done>[Definition of done — concrete observable outcome]</done>
</task>

<task type="code">
  <name>[Task name]</name>
  <files>[file paths]</files>
  <action>[What to do]</action>
  <verify>[How to verify]</verify>
  <done>[Definition of done]</done>
</task>

## Verification

[How to verify this plan achieved its objective]

## Contract Coverage

| Contract | Addressed By | Verified |
|----------|-------------|----------|
| FEAT-01 | Task 1, Task 2 | [ ] |
| FEAT-03 | Task 3 | [ ] |
```

</template>

<guidelines>

**Plans are prompts:**
- Each plan is a complete prompt for the builder agent
- Must contain enough context to execute without asking questions
- Tasks are ordered and actionable

**Frontmatter:**
- `contracts: [FEAT-01, FEAT-03]` — which contracts this plan addresses
- `wave` — execution order (wave 1 runs first, wave 2 after wave 1 completes)
- `depends_on` — other plan IDs this depends on
- `autonomous: true` — builder can execute without user input

**Task XML format:**
- `<task type="code|config|test">` — categorizes the work
- `<name>` — short descriptive name
- `<files>` — files that will be created or modified
- `<action>` — detailed instructions (the actual prompt)
- `<verify>` — how to check the task is done correctly
- `<done>` — definition of done (concrete outcome)

**Contract coverage:**
- Every FEAT listed in frontmatter `contracts` must appear in the coverage table
- Coverage table maps contracts to specific tasks
- After execution, coverage is verified

</guidelines>
