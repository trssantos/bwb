# BWB Workflow: Initialize Existing Project

<purpose>
Onboard an existing (brownfield) project into the BWB planning system. Detects the current
tech stack, asks a short set of questions to understand context and intent, then generates
the `.planning/` directory so the project can use all BWB workflows going forward.
</purpose>

<process>

## Step 1 — Detect Project

Run the BWB CLI brownfield initializer to scan the project root.

```
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init brownfield)
```

Parse the JSON output. Expected fields:
- `project_name` — derived from package.json, Cargo.toml, directory name, etc.
- `detected_types` — array of languages/runtimes found (e.g. ["typescript", "python"])
- `frameworks` — array of detected frameworks (e.g. ["next", "prisma", "tailwind"])
- `source_file_count` — total number of source files
- `key_directories` — notable directories (src/, lib/, tests/, etc.)
- `entry_points` — detected entry files
- `has_tests` — boolean
- `package_manager` — npm, yarn, pnpm, cargo, pip, etc.

## Step 2 — Display Detection Results

Present the findings clearly:

```
Detected project: {project_name}
Languages:        {detected_types joined}
Frameworks:       {frameworks joined}
Source files:     {source_file_count}
Key directories:  {key_directories joined}
Tests found:      {has_tests ? "Yes" : "No"}
```

## Step 3 — Interactive Q&A

Since the project already exists, this is shorter than a greenfield /bwb:new session.
Use AskUserQuestion for each question. Do NOT proceed without answers.

### Question 1: Confirm Tech Stack

```
AskUserQuestion: "Here's what I detected — is this accurate, or should I add/remove anything?
  Languages: {detected_types}
  Frameworks: {frameworks}
  (Type 'correct' or describe changes)"
```

Update detection data if the user corrects anything.

### Question 2: Project Purpose and Current State

```
AskUserQuestion: "What does this project do, and what state is it in?
  For example: 'It's a SaaS billing dashboard, mostly working but needs a reporting module'
  or 'CLI tool for data migration, early prototype'"
```

Store the response as `project_purpose` and `current_state`.

### Question 3: Immediate Intent

```
AskUserQuestion: "What do you want to work on first?
  Examples:
  - 'Add user authentication'
  - 'Fix the broken search feature'
  - 'Refactor the database layer'
  - 'Add tests for the API routes'"
```

Store the response as `first_task`.

## Step 4 — Write BWB Config

```
AskUserQuestion: "Quick setup — three questions:
  1. Model profile? (pro = Claude with extended thinking, fast = quick responses, auto = let BWB decide)
  2. Commit planning docs automatically? (yes/no)
  3. Search gitignored files during analysis? (yes/no)
  Respond like: pro, yes, no"
```

Parse the three values. Write `.planning/config.json`:

```json
{
  "project_name": "{project_name}",
  "created": "{ISO timestamp}",
  "init_mode": "brownfield",
  "model_profile": "{parsed_model}",
  "commit_docs": {parsed_commit_bool},
  "search_gitignored": {parsed_search_bool},
  "detected_stack": {
    "languages": ["{detected_types}"],
    "frameworks": ["{frameworks}"],
    "package_manager": "{package_manager}"
  }
}
```

## Step 5 — Generate .planning/ Directory

Create the planning directory structure:

```
mkdir -p .planning/phases
```

### 5a — PROJECT.md

Read the template from `/Users/dustbit/.claude/bwb/templates/project.md`.

Fill in all sections using detection data and Q&A responses:
- **Project Name**: from `project_name`
- **Purpose**: from `project_purpose`
- **Current State**: from `current_state`
- **Tech Stack**: from confirmed `detected_types` and `frameworks`
- **Key Directories**: from `key_directories`
- **Entry Points**: from `entry_points`
- **Testing**: from `has_tests` plus any user notes

Write to `.planning/PROJECT.md`.

### 5b — ROADMAP.md

Create a roadmap with a single initial phase based on `first_task`:

```markdown
# Roadmap

## Phase 1: {first_task title}

- **Status**: not_started
- **Goal**: {derived from first_task}
- **Success Criteria**:
  - [ ] {criterion derived from first_task}
  - [ ] All existing tests still pass
- **Directory**: `.planning/phases/1-{slug}/`
```

Write to `.planning/ROADMAP.md`.

### 5c — STATE.md

```markdown
# Project State

## Current Phase
Phase 1: {first_task title}

## Status
- Phase 1: not_started

## Last Updated
{ISO timestamp}

## Session Log
- {ISO timestamp}: Project initialized (brownfield) — {source_file_count} source files detected
```

Write to `.planning/STATE.md`.

Create the phase directory:

```
mkdir -p .planning/phases/1-{slug}
```

## Step 6 — Commit

If `commit_docs` is true:

```bash
cd {project_root}
git add .planning/
git commit -m "chore: initialize BWB planning for existing project

Detected: {detected_types joined}, {frameworks joined}
Source files: {source_file_count}
First phase: {first_task title}"
```

## Step 7 — Offer Baseline (Brownfield)

If `source_file_count > 20`, offer baseline extraction before routing:

Use AskUserQuestion:
- header: "Baseline?"
- question: "This project has ${source_file_count} source files. Want to create a baseline (Phase 00) to track existing features and catch regressions?"
- options:
  - "Yes" — Analyze codebase and extract contracts for existing features
  - "Later" — Skip for now, run /bwb:baseline when ready
  - "No" — Skip baseline entirely

If "Yes": Route to `/bwb:baseline` (run before research/add routing).
If "Later" or "No": Continue to Step 8.

## Step 8 — Route to Next Workflow

Determine routing based on `first_task` complexity:

- If the task sounds like it needs investigation (refactor, fix, understand, debug):
  Route to `/bwb:research 1`
- If the task sounds actionable and clear (add X, create Y, implement Z):
  Route to `/bwb:add 1`

Display the recommendation:

```
Project initialized. .planning/ directory created with:
  - PROJECT.md (project overview)
  - ROADMAP.md (Phase 1: {first_task title})
  - STATE.md (tracking)

Recommended next step: /bwb:{research|add} 1
```

</process>

<offer_next>
- `/bwb:baseline` — Analyze existing codebase and create regression baseline (Phase 00)
- `/bwb:research 1` — Investigate the codebase before making changes (recommended for refactors, fixes, unfamiliar code)
- `/bwb:add 1` — Start working on Phase 1 directly (recommended for clear, well-defined tasks)
- `/bwb:quick "description"` — Skip the phase system and do a quick tracked task instead
</offer_next>

<success_criteria>
- Detection results are displayed and confirmed by the user
- At least 3 interactive questions are asked and answered
- `.planning/config.json` exists with valid configuration
- `.planning/PROJECT.md` exists with project details from both detection and Q&A
- `.planning/ROADMAP.md` exists with at least one phase
- `.planning/STATE.md` exists with current status
- Phase 1 directory is created under `.planning/phases/`
- If commit_docs is enabled, all planning files are committed
- User is given a clear next step recommendation
</success_criteria>
