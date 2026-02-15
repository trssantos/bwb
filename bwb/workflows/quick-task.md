# BWB Workflow: Quick Task

<purpose>
Execute a small, well-defined task with the full BWB quality flow — contracts, atomic commits,
validation — compressed into a single session. No separate research step. Discussion and
contracts are brief but present. Every change gets a contract and gets validated.
This is the "I just need to do one thing properly" workflow.
</purpose>

<process>

## Step 1 — Initialize Quick Task

The user invokes this with a description: `/bwb:quick "add rate limiting to the API"`

Run the BWB CLI quick initializer:

```
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init quick "$DESCRIPTION")
```

Parse the JSON output. Expected fields:
- `next_num` — sequential task number (e.g. 1, 2, 3)
- `slug` — URL-safe slug from description
- `task_dir` — full path: `.planning/quick/{next_num}-{slug}/`
- `models` — model configuration from config.json
- `project_name` — from config
- `current_phase` — active phase if any (for context)

Create the task directory:

```
mkdir -p {task_dir}
```

Display task header:

```
Quick Task #{next_num}: {DESCRIPTION}
Directory: {task_dir}
```

## Step 2 — Quick Discussion

Keep this brief. One question to sharpen intent and catch edge cases.

```
AskUserQuestion: "You want to: {DESCRIPTION}

Before I start — any specific behavior, edge cases, or constraints I should know about?
For example:
  - Specific files or modules to touch (or avoid)
  - Expected behavior details
  - Compatibility concerns
  (Type 'go' if the description is sufficient)"
```

Store the response as `clarifications`. If the user said "go" or equivalent, proceed
with the original description only.

Combine `DESCRIPTION` + `clarifications` into `task_intent`.

## Step 3 — Quick Contracts

Extract 1-3 FEAT entries from `task_intent`. Quick tasks should be small — if more than
3 features emerge, suggest the user run a full `/bwb:add` phase instead.

Format each contract entry:

```
FEAT-Q{next_num}.{n}: {feature description}
  Given: {precondition}
  When: {action}
  Then: {expected outcome}
```

Write `{task_dir}/CONTRACTS.md`:

```markdown
# Quick Task Contracts

Task: {DESCRIPTION}
Created: {ISO timestamp}
Type: quick

## Features

### FEAT-Q{next_num}.1: {title}
- **Given**: {precondition}
- **When**: {action}
- **Then**: {expected outcome}
- **Status**: pending

### FEAT-Q{next_num}.2: {title}
- **Given**: {precondition}
- **When**: {action}
- **Then**: {expected outcome}
- **Status**: pending

{### FEAT-Q{next_num}.3 if needed}
```

Display the contracts:

```
Contracts defined ({count}):
  FEAT-Q{next_num}.1: {title}
  FEAT-Q{next_num}.2: {title}
  {FEAT-Q{next_num}.3 if present}
```

## Step 4 — Plan and Execute

### 4a — Create Focused Plan

Using `task_intent` and the contracts, create a plan with 1-2 tasks maximum.
This is inline — no separate planning session.

Write `{task_dir}/PLAN.md`:

```markdown
# Quick Task Plan

## Task 1: {description}
- **Contracts**: FEAT-Q{next_num}.1{, FEAT-Q{next_num}.2 if related}
- **Files**: {estimated files to modify}
- **Approach**: {1-2 sentence approach}

## Task 2: {description if needed}
- **Contracts**: FEAT-Q{next_num}.{n}
- **Files**: {estimated files to modify}
- **Approach**: {1-2 sentence approach}
```

### 4b — Execute with bwb-builder

For each task in the plan, use the **bwb-builder** agent approach:

1. Read the relevant source files
2. Implement the changes
3. Run any existing tests to check for regressions
4. Make an atomic commit per task:

```bash
git add {changed_files}
git commit -m "{type}: {concise description}

Quick Task #{next_num}: {DESCRIPTION}
Contracts: {FEAT IDs addressed}"
```

Track which contracts each commit addresses. Update contract status to `implemented`
in `{task_dir}/CONTRACTS.md` as each one is completed.

### 4c — Write SUMMARY.md

After all tasks are executed, write `{task_dir}/SUMMARY.md`:

```markdown
# Quick Task Summary

- **Task**: {DESCRIPTION}
- **Type**: quick
- **Started**: {start_timestamp}
- **Completed**: {end_timestamp}
- **Commits**: {commit_count}

## Contracts Addressed
- FEAT-Q{next_num}.1: {title} — implemented
- FEAT-Q{next_num}.2: {title} — implemented

## Files Changed
- {file_path}: {what changed}
- {file_path}: {what changed}

## Notes
{any relevant notes about decisions made, trade-offs, or follow-ups}
```

## Step 5 — Validate

This is the critical step that distinguishes quick tasks from untracked changes.

Spawn the **bwb-validator** agent against the quick contracts:

```
For each contract in {task_dir}/CONTRACTS.md:
  Validate using the 6-level validation scale:
    Level 1 (Structural): Do the expected files/functions/exports exist?
    Level 2 (Behavioral): Does the code path execute the described behavior?
    Level 3 (Contract):   Does the Given/When/Then hold true?
    Level 4 (Integration): Does it work with surrounding code without breaking imports/types?
    Level 5 (Regression):  Do existing tests still pass?
    Level 6 (Edge Cases):  Are obvious edge cases handled?
```

For a quick task, focus on Levels 1-4. Levels 5-6 are checked if tests exist
and if the clarifications mentioned edge cases.

Write validation results to `{task_dir}/VALIDATION.md`:

```markdown
# Validation Results

## FEAT-Q{next_num}.1: {title}
- Level 1 (Structural): PASS/FAIL — {detail}
- Level 2 (Behavioral): PASS/FAIL — {detail}
- Level 3 (Contract):   PASS/FAIL — {detail}
- Level 4 (Integration): PASS/FAIL — {detail}
- Level 5 (Regression):  PASS/SKIP — {detail}
- Level 6 (Edge Cases):  PASS/SKIP — {detail}
- **Result**: PASS/FAIL

## FEAT-Q{next_num}.2: {title}
- Level 1 (Structural): PASS/FAIL — {detail}
- Level 2 (Behavioral): PASS/FAIL — {detail}
- Level 3 (Contract):   PASS/FAIL — {detail}
- Level 4 (Integration): PASS/FAIL — {detail}
- Level 5 (Regression):  PASS/SKIP — {detail}
- Level 6 (Edge Cases):  PASS/SKIP — {detail}
- **Result**: PASS/FAIL

## Overall
- **Passed**: {count}/{total}
- **Failed**: {count}/{total}
- **Skipped**: {count}/{total}
```

## Step 6 — Fix If Needed

If any contract FAILED validation (Levels 1-4):

Use the **bwb-fixer** agent to address the gap. One fix loop maximum for quick tasks.

1. Read the FAIL details from VALIDATION.md
2. Identify the specific gap
3. Implement the fix
4. Commit the fix:

```bash
git add {fixed_files}
git commit -m "fix: address validation gap in FEAT-Q{next_num}.{n}

{Brief description of what was fixed}"
```

5. Re-validate ONLY the failed contracts
6. Update VALIDATION.md with the new results
7. Update SUMMARY.md with the additional commit

If the fix loop also fails, note it in SUMMARY.md and recommend the user
run a full `/bwb:add` phase for this work.

**Important**: Only ONE fix loop. If it still fails after one attempt, stop and report.

## Step 7 — Update State

Update `.planning/STATE.md` session log:

```markdown
- {ISO timestamp}: Quick Task #{next_num} completed — "{DESCRIPTION}" — {pass_count}/{total} contracts validated
```

If there is an active phase, also note the quick task in the phase context if relevant.

## Step 8 — Commit Docs and Display Results

Commit all planning documents:

```bash
git add {task_dir}/
git add .planning/STATE.md
git commit -m "docs: quick task #{next_num} planning artifacts

Task: {DESCRIPTION}
Contracts: {total} defined, {pass_count} validated
Files changed: {file_count}"
```

Display final results:

```
Quick Task #{next_num} Complete: {DESCRIPTION}

Contracts:  {pass_count}/{total} passed
Commits:    {commit_count} (including fixes)
Files:      {file_count} changed

Validation:
  FEAT-Q{next_num}.1: {PASS/FAIL}
  FEAT-Q{next_num}.2: {PASS/FAIL}

{If all passed:  "All contracts validated. Clean task."}
{If some failed: "Some contracts could not be validated. Consider /bwb:add for a deeper pass."}

Artifacts: {task_dir}/
  - CONTRACTS.md
  - PLAN.md
  - SUMMARY.md
  - VALIDATION.md
```

</process>

<offer_next>
- `/bwb:quick "next task"` — Run another quick task
- `/bwb:add` — Start a full phase if the quick task revealed larger scope
- `/bwb:status` — View project status including quick task history
- `/bwb:validate {phase}` — Re-run validation on a previous phase if needed
</offer_next>

<success_criteria>
- `bwb.js init quick` is called and task directory is created
- User is asked to confirm intent and clarify edge cases via AskUserQuestion
- 1-3 FEAT contracts are defined in CONTRACTS.md with Given/When/Then format
- A focused plan of 1-2 tasks is created in PLAN.md
- All implementation changes are made with atomic commits referencing contract IDs
- SUMMARY.md is written with type: quick and contracts_addressed
- bwb-validator runs the 6-level validation against all defined contracts
- VALIDATION.md contains per-contract, per-level results
- If any Level 1-4 validation fails, bwb-fixer attempts ONE fix loop
- After the fix loop, failed contracts re-validated and results updated
- STATE.md is updated with the quick task completion entry
- All planning artifacts are committed
- Final results displayed with pass/fail counts and file change summary
- No more than ONE fix loop is attempted — escalate to /bwb:add if still failing
</success_criteria>
