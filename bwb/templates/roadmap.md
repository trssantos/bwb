# Roadmap Template

Template for `.planning/ROADMAP.md`.

<template>

```markdown
# Roadmap: [Project Name]

## Overview

[One paragraph describing the journey from start to finish]

## Phases

- [ ] **Phase 1: [Name]** - [One-line description]
- [ ] **Phase 2: [Name]** - [One-line description]
- [ ] **Phase 3: [Name]** - [One-line description]

## Phase Details

### Phase 1: [Name]
**Goal**: [What this phase delivers]
**Depends on**: Nothing (first phase)
**Contracts**: TBD
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
  3. [Observable behavior from user perspective]
**Plans**: TBD

### Phase 2: [Name]
**Goal**: [What this phase delivers]
**Depends on**: Phase 1
**Contracts**: TBD
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
**Plans**: TBD

### Phase 3: [Name]
**Goal**: [What this phase delivers]
**Depends on**: Phase 2
**Contracts**: TBD
**Success Criteria** (what must be TRUE):
  1. [Observable behavior from user perspective]
  2. [Observable behavior from user perspective]
**Plans**: TBD

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. [Name] | Not started | - |
| 2. [Name] | Not started | - |
| 3. [Name] | Not started | - |
```

</template>

<guidelines>

**Phases:**
- Each phase delivers something coherent
- No time estimates (this isn't enterprise PM)
- Phase count depends on project scope (typically 3-8)
- Progress table updated by build workflow

**Success criteria:**
- 2-5 observable behaviors per phase (from user's perspective)
- These become seed material for CONTRACTS.md during `/bwb:contracts`
- Format: "User can [action]" or "[Thing] works/exists"
- Cross-checked against requirements during roadmap creation

**Contracts:**
- Initially "TBD" — populated during `/bwb:contracts {phase}`
- Shows contract count when populated (e.g., "5 contracts (FEAT-01 through FEAT-05)")

**Phase flow:**
After roadmap creation, each phase follows:
`/bwb:research` → `/bwb:discuss` → `/bwb:contracts` → `/bwb:plan` → `/bwb:build` → `/bwb:validate`

</guidelines>

<status_values>
- `Not started` — Haven't begun
- `In progress` — Currently working
- `Complete` — Done (add completion date)
</status_values>
