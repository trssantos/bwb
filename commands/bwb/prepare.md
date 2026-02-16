---
name: bwb:prepare
description: Prepare environment for validation — auto-setup deps, configure or mock external services
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Edit
  - Task
  - AskUserQuestion
  - Glob
  - Grep
---
<context>
BWB's environment preparation engine. Scans built code for external dependencies (API keys, credentials, database connections), auto-sets up what it can, asks the user per service (configure real / mock / skip), and generates test fixtures so validation can verify logic without real credentials. Produces PREPARATION.md.
</context>

<objective>
Prepare environment for validation by resolving external dependencies.

**Reads:**
- `.planning/phases/{NN}-{name}/{NN}-CONTRACTS.md` (what features exist)
- `.planning/phases/{NN}-{name}/{NN}-{plan}-SUMMARY.md` (what was built)
- Project source code (to discover dependencies)

**Creates:**
- `.planning/phases/{NN}-{name}/{NN}-PREPARATION.md`
- `test/mocks/` directory with fixtures (if user chose to mock services)

**After this command:** Run `/bwb:validate {phase}` to validate features.
</objective>

<execution_context>
@/Users/dustbit/.claude/bwb/workflows/prepare-phase.md
</execution_context>

<process>
Execute the prepare-phase workflow from @/Users/dustbit/.claude/bwb/workflows/prepare-phase.md end-to-end.
Pass $ARGUMENTS as the phase number.
</process>
