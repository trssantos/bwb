<purpose>
Orchestrates brownfield baseline extraction. Analyzes an existing codebase, extracts behavioral contracts for discovered features, and creates Phase 00 (legacy baseline) that enables regression testing via /bwb:validate.

Flow: Initialize → Detect areas → User confirm → Spawn analyzer(s) → Aggregate FEATs → User review → Write Phase 00 → Optional validate → Update roadmap/state → Commit → Route.
</purpose>

<required_reading>
- `.planning/PROJECT.md` — project context (if exists)
- `.planning/ROADMAP.md` — existing roadmap (if exists)
</required_reading>

<process>

## Step 1: Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init baseline)
```

Parse JSON for: `areas`, `has_phase_00`, `project_name`, `detected_types`, `source_file_count`, `commit_docs`, `planning_exists`.

**If `planning_exists` is false:** Error — run `/bwb:init` first to set up `.planning/`.

**If `has_phase_00` is true:**

Use AskUserQuestion:
- header: "Phase 00 exists"
- question: "Phase 00 (baseline) already exists. What do you want to do?"
- options:
  - "Re-analyze" — Rescan codebase and regenerate contracts
  - "View" — Show existing baseline contracts
  - "Skip" — Keep existing baseline

If "View": Read and display `.planning/phases/00-baseline/00-CONTRACTS.md`, then stop.
If "Skip": Stop — baseline already exists.
If "Re-analyze": Continue with the flow below.

## Step 2: Present Detected Areas

Display detection results:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► BASELINE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${project_name}
Source files: ${source_file_count}

Detected ${areas.length} feature areas:
${areas.map((a, i) => `  ${i+1}. ${a.name} (${a.path}, ${a.files} files)`).join('\n')}
```

Use AskUserQuestion:
- header: "Areas"
- question: "Which areas should I analyze for baseline contracts?"
- options:
  - "All areas" — Analyze everything detected
  - "Select areas" — Let me pick which ones
  - "Custom" — I'll specify directories manually

If "Select areas": Ask which area numbers to include.
If "Custom": Ask for directory paths to analyze.

## Step 3: Load Project Context

Read supporting context (if exists):

```bash
# Project overview
PROJECT=$(cat .planning/PROJECT.md 2>/dev/null || echo "No PROJECT.md")

# Existing roadmap
ROADMAP=$(cat .planning/ROADMAP.md 2>/dev/null || echo "No ROADMAP.md")
```

## Step 4: Spawn Analyzer Agent(s)

Resolve analyzer model:
```bash
ANALYZER_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-analyzer --raw)
```

**Strategy:** Spawn one agent per area (up to 3 in parallel). For more than 3 areas, batch into waves of 3.

For each area, spawn:

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-analyzer.md for your role and instructions.\n\n<analysis_scope>\n**Area:** ${area.name}\n**Path:** ${area.path}\n**Project context:**\n${project_context}\n</analysis_scope>\n\nAnalyze this area and return FEAT drafts following your output format.",
  subagent_type="general-purpose",
  model="${ANALYZER_MODEL}",
  description="Analyze ${area.name}"
)
```

Collect results from all agents.

## Step 5: Aggregate Results

Combine FEAT drafts from all analyzers:

1. **Collect** all FEAT entries from all area results
2. **Deduplicate** — if two areas found the same feature (e.g. both auth areas reference login), merge them
3. **Renumber** — assign sequential IDs: FEAT-01, FEAT-02, FEAT-03, ...
4. **Establish dependencies** — if FEAT-03 references functionality from FEAT-01, add `Depends: FEAT-01`
5. **Tally** — count total FEATs and total acceptance criteria

Display:

```
Analysis complete. Found ${feat_count} features across ${area_count} areas.

| ID | Feature | Area | Criteria |
|----|---------|------|----------|
| FEAT-01 | {title} | {area} | {count} |
| FEAT-02 | {title} | {area} | {count} |
...
```

## Step 6: User Review

Present all extracted contracts for approval. For each FEAT, show the full draft.

Use AskUserQuestion:
- header: "Contracts"
- question: "Review these ${feat_count} baseline contracts. Any changes?"
- options:
  - "Looks good" — Approve and create Phase 00
  - "Modify" — I want to change some
  - "Add more" — Missing a feature I know about
  - "Remove some" — Too many or irrelevant

**If "Modify":** Ask which FEAT to modify, get changes, update.
**If "Add more":** Ask what behavior is missing, create new FEAT.
**If "Remove some":** Ask which FEATs to remove, verify, remove.

Iterate until user approves.

## Step 7: Create Phase 00

```bash
mkdir -p .planning/phases/00-baseline
```

Write `00-CONTRACTS.md`:

```markdown
---
phase: 00-baseline
baseline: true
status: approved
extracted: {ISO date}
areas_analyzed: {count}
feat_count: {count}
---

# Phase 0: Legacy Baseline — Contracts

**Extracted:** {date}
**Source:** Codebase analysis — {areas analyzed}
**Purpose:** Regression safety net for existing features

## Contract Summary

| ID | Title | Area | Depends |
|----|-------|------|---------|
| FEAT-01 | {title} | {area} | — |
| FEAT-02 | {title} | {area} | FEAT-01 |
...

## Contracts

### FEAT-01: {Title}

**What:** {behavioral description}
**Expected:** {observable outcome}

**Acceptance Criteria:**
1. {criterion}
2. {criterion}
3. {criterion}

**Source:** Codebase analysis — {entry point or file pattern}
**Depends:** {deps or "None"}

### FEAT-02: {Title}
...

## Feature Area Mapping

| Area | Path | FEATs |
|------|------|-------|
| {area_name} | {area_path} | FEAT-01, FEAT-02 |
| {area_name} | {area_path} | FEAT-03, FEAT-04 |

---

*Phase: 00-baseline*
*Baseline extracted: {date}*
```

## Step 8: Offer Initial Validation

Use AskUserQuestion:
- header: "Validate now?"
- question: "Want to run baseline validation now? This checks that all detected features currently pass L1-L5."
- options:
  - "Yes" — Run /bwb:validate 0 now
  - "Later" — Skip, I'll validate when needed

If "Yes": Tell the user to run `/bwb:validate 0` after this completes (separate context window).

## Step 9: Update ROADMAP.md and STATE.md

**ROADMAP.md** — Insert Phase 00 at the top (before any existing phases):

```markdown
## Phase 0: Legacy Baseline

- **Status**: baselined
- **Goal**: Regression safety net for existing features
- **Contracts**: ${feat_count} behavioral contracts extracted from codebase analysis
- **Directory**: `.planning/phases/00-baseline/`
```

**STATE.md** — Add session log entry:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "baseline", "Status": "Baseline extracted"}'
```

Also append to session log:
```
- {ISO timestamp}: Baseline extracted — ${feat_count} contracts from ${area_count} areas
```

## Step 10: Commit

If `commit_docs` is true:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(00): extract baseline contracts from existing codebase" --files ".planning/phases/00-baseline/00-CONTRACTS.md .planning/ROADMAP.md .planning/STATE.md"
```

## Step 11: Route

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► BASELINE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 00: Legacy Baseline created
Contracts: ${feat_count} features across ${area_count} areas

File: .planning/phases/00-baseline/00-CONTRACTS.md

To check for regressions at any time:
  /bwb:validate 0

To continue with new work:
  /bwb:research 1  or  /bwb:add
```

</process>

<success_criteria>
- [ ] Project has `.planning/` directory
- [ ] Areas detected and confirmed by user
- [ ] bwb-analyzer spawned per area with proper context
- [ ] FEAT drafts collected and deduplicated
- [ ] User reviewed and approved contracts
- [ ] `.planning/phases/00-baseline/00-CONTRACTS.md` written with `baseline: true` frontmatter
- [ ] ROADMAP.md updated with Phase 00
- [ ] STATE.md updated with baseline session
- [ ] Committed if commit_docs enabled
- [ ] User given clear next steps

Quality indicators:
- **Behavioral FEATs:** Contracts describe what users can do, not code structure
- **Evidence-backed:** Every FEAT references real files and line numbers
- **Coarse-grained:** Baseline contracts are broader than normal (regression safety, not full spec)
- **No false features:** Only real, existing functionality contracted
</success_criteria>
