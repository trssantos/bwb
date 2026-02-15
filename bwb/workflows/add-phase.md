# BWB Workflow: Add Phase

<purpose>
Add a new phase to an existing project's roadmap. This is used when the user wants to
plan a new feature, module, fix area, or body of work after the project has already been
initialized with `.planning/`. Keeps the roadmap growing organically.
</purpose>

<process>

## Step 1 — Load Current State

Read the existing planning documents:

```
PROJECT=$(cat .planning/PROJECT.md)
ROADMAP=$(cat .planning/ROADMAP.md)
STATE=$(cat .planning/STATE.md)
```

Parse the ROADMAP to determine:
- `existing_phases` — list of all phases with their status
- `last_phase_number` — highest phase number currently in the roadmap
- `active_phase` — any phase currently in progress

If no `.planning/` directory exists, stop and recommend `/bwb:init` first.

Display current roadmap summary:

```
Current roadmap has {count} phase(s):
{for each phase: "  Phase {n}: {title} [{status}]"}
```

## Step 2 — Ask What to Add

```
AskUserQuestion: "What do you want to add as the next phase?
  Describe the feature, module, fix area, or body of work.
  Examples:
  - 'Add Stripe payment integration'
  - 'Refactor the authentication module'
  - 'Build admin dashboard'
  - 'Fix performance issues in search'"
```

Store the response as `phase_description`.

## Step 3 — Create Phase via CLI

Run the BWB CLI to register the new phase and create its directory:

```
RESULT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js phase add "{phase_description}")
```

Parse the JSON output. Expected fields:
- `phase_number` — the assigned phase number
- `slug` — URL-safe slug derived from description
- `phase_dir` — full path to the new phase directory
- `title` — cleaned-up title for the phase

Confirm creation:

```
Created Phase {phase_number}: {title}
Directory: .planning/phases/{phase_number}-{slug}/
```

## Step 4 — Ask About Goal and Criteria

```
AskUserQuestion: "Want to define a goal and success criteria for this phase now?
  This helps keep work focused and lets validation check your progress later.
  (yes/no)"
```

If the user answers **no**: skip to Step 6 with a generic goal placeholder.

## Step 5 — Define Goal and Success Criteria

### 5a — Ask for the Goal

```
AskUserQuestion: "What's the goal for Phase {phase_number}?
  State it as a single clear outcome.
  Example: 'Users can sign up, log in, and reset their password via email'"
```

Store as `phase_goal`.

### 5b — Derive Success Criteria

Based on `phase_goal` and `phase_description`, derive 2-3 concrete success criteria.
Present them to the user for confirmation:

```
AskUserQuestion: "Here are the success criteria I'd suggest:
  1. {criterion_1}
  2. {criterion_2}
  3. {criterion_3}
  Want to adjust any of these? (Type 'good' to accept, or describe changes)"
```

Adjust criteria based on user feedback. Store as `success_criteria[]`.

## Step 6 — Update ROADMAP.md

Append the new phase entry to `.planning/ROADMAP.md`:

```markdown
## Phase {phase_number}: {title}

- **Status**: not_started
- **Goal**: {phase_goal or "To be defined during research"}
- **Success Criteria**:
  - [ ] {criterion_1 or "TBD"}
  - [ ] {criterion_2 or "TBD"}
  {- [ ] criterion_3 if present}
- **Directory**: `.planning/phases/{phase_number}-{slug}/`
```

Also update `.planning/STATE.md` session log:

```markdown
- {ISO timestamp}: Added Phase {phase_number} — {title}
```

## Step 7 — Commit

Read `commit_docs` from `.planning/config.json`. If true:

```bash
git add .planning/ROADMAP.md .planning/STATE.md .planning/phases/{phase_number}-{slug}/
git commit -m "chore: add Phase {phase_number} — {title}

Goal: {phase_goal or 'TBD'}
Criteria: {count} defined"
```

## Step 8 — Route to Research

Display summary and recommend next step:

```
Phase {phase_number} added to roadmap: {title}
Goal: {phase_goal or "Not yet defined"}
Criteria: {count} success criteria

Next step: /bwb:research {phase_number}
```

</process>

<offer_next>
- `/bwb:research {phase_number}` — Investigate the codebase to build context for this phase (recommended)
- `/bwb:discuss {phase_number}` — Discuss requirements and constraints before researching
- `/bwb:status` — View full project status and roadmap
</offer_next>

<success_criteria>
- Existing ROADMAP.md is read and current phases are displayed
- User is asked what they want to add via AskUserQuestion
- `bwb.js phase add` is called and phase directory is created
- User is offered the chance to define goal and success criteria
- If goal is defined, 2-3 success criteria are derived and confirmed
- ROADMAP.md is updated with the new phase entry
- STATE.md session log is updated
- If commit_docs is enabled, changes are committed
- User is routed to `/bwb:research {phase_number}` as the recommended next step
</success_criteria>
