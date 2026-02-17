<purpose>
Automated fix cycle for validation gaps. Reads GAPs from VALIDATION.md, spawns bwb-fixer for targeted fix plans, executes them, and runs FULL re-validation (all contracts). Loops automatically until clean or max iterations reached. Configurable via /bwb:settings.

Flow: Load gaps → Fix all gaps → Full re-validation → Loop or complete.
</purpose>

<required_reading>
- `.planning/phases/XX-name/XX-VALIDATION.md` — gaps to fix
- `.planning/phases/XX-name/XX-CONTRACTS.md` — acceptance criteria
</required_reading>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init phase-op "$ARGUMENTS")
```

Parse JSON for: `fixer_model`, `builder_model`, `validator_model`, `commit_docs`, `phase_dir`, `phase_number`, `phase_name`, `padded_phase`, `has_validation`, `fix_max_iterations`, `fix_auto_retry`.

**If `has_validation` is false:** Error — run `/bwb:validate ${phase}` first.

Set from config:
- `max_iterations` = `fix_max_iterations` (default 5)
- `auto_retry` = `fix_auto_retry` (default true)

## 2. Load Initial Gaps

```bash
RESULTS=$(node /Users/dustbit/.claude/bwb/bin/bwb.js validation-status "${phase_dir}/${padded_phase}-VALIDATION.md")
```

Parse gap details: GAP ID, contract ref, failed level, severity, description, proposed fix, files.

**If no gaps:** Phase already validated. Route to next phase.

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► FIX LOOP — Phase ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${gap_count} gaps to fix:

| GAP | Contract | Level | Severity | Description |
|-----|----------|-------|----------|-------------|
${gap_table}
```

## 3. Gap Selection

**If `auto_retry` is true:** Skip this step — fix ALL gaps automatically. No user interaction.

**If `auto_retry` is false:** Use AskUserQuestion (multiSelect: true):
- header: "Fix gaps"
- question: "Which gaps do you want to fix?"
- options: Each gap as an option with severity and description

Store selected gaps.

## 4. Fix Loop

Track: `iteration = 1`

### FOR iteration = 1 TO max_iterations:

### 4a. Load Gaps from VALIDATION.md

```bash
RESULTS=$(node /Users/dustbit/.claude/bwb/bin/bwb.js validation-status "${phase_dir}/${padded_phase}-VALIDATION.md")
```

Parse current gaps. **If no gaps → BREAK (all clean!)**

For iteration > 1 in auto_retry mode, use all current gaps (not original selection).

### 4b. Display Iteration Banner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► FIX ITERATION ${iteration}/${max_iterations} — ${gap_count} gaps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4c. Spawn Fixer Agent(s)

For each gap, resolve fixer model:
```bash
FIXER_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-fixer --raw)
```

Spawn bwb-fixer for each gap (parallel if multiple):

```markdown
<fix_context>
**Phase:** ${phase_number} - ${phase_name}
**Iteration:** ${iteration}/${max_iterations}

**GAP to fix:**
ID: ${gap_id}
Contract: ${feat_id} — ${feat_title}
Failed level: ${level}
What's wrong: ${description}
Evidence: ${evidence}
Proposed fix: ${proposed_fix}
Files: ${affected_files}

**Contract acceptance criteria:**
${acceptance_criteria}
</fix_context>

<output>
Fix plan: ${phase_dir}/${padded_phase}-fix-${fix_num}-PLAN.md
Fix summary: ${phase_dir}/${padded_phase}-fix-${fix_num}-SUMMARY.md
</output>
```

If iteration > 1, prepend to the fix prompt:
```
**Previous fix attempt failed.** Read the gap evidence carefully
for what was already tried. Take a different approach this time.
```

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-fixer.md for your role.\nThen read /Users/dustbit/.claude/agents/bwb-builder.md for execution.\n\n" + fix_prompt,
  subagent_type="general-purpose",
  model="${FIXER_MODEL}",
  description="Fix ${gap_id}"
)
```

### 4d. Collect Fix Results

After fixer returns, spot-check:
- Fix PLAN.md exists
- Fix SUMMARY.md exists
- Git commits present

Report:
```
Fix ${gap_id}: ${status}
  Changed: ${files_changed}
  Commit: ${commit_hash}
```

### 4e. Full Re-validation

Spawn bwb-validator with ALL contracts (not just affected FEATs):

```bash
VALIDATOR_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-validator --raw)
```

Read ALL contracts from `${phase_dir}/${padded_phase}-CONTRACTS.md`.
Read CONTEXT from `${phase_dir}/${padded_phase}-CONTEXT.md` for L6 checks.
Read all SUMMARY.md files from the phase directory.

```markdown
<validation_context>
**Phase:** ${phase_number} - ${phase_name}
**Full re-validation after fix iteration ${iteration}**

**ALL CONTRACTS (validate every one):**
${all_contracts_content}

**CONTEXT (for L6):**
${context_content}

**SUMMARIES:**
${all_summaries}
</validation_context>

<output>
Write FRESH: ${phase_dir}/${padded_phase}-VALIDATION.md
(Complete replacement — validate ALL contracts from scratch)
</output>
```

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-validator.md for your role.\n\n" + validation_prompt,
  subagent_type="bwb-validator",
  model="${VALIDATOR_MODEL}",
  description="Re-validate phase ${phase_number}"
)
```

### 4f. Check Results

```bash
RESULTS=$(node /Users/dustbit/.claude/bwb/bin/bwb.js validation-status "${phase_dir}/${padded_phase}-VALIDATION.md")
```

**If no gaps → BREAK (success!)**

**If gaps remain AND `auto_retry` is true AND iteration < max_iterations:**
```
${remaining} gaps remain after iteration ${iteration}. Auto-retrying...
```
Continue to next iteration.

**If gaps remain AND `auto_retry` is false AND iteration < max_iterations:**
Use AskUserQuestion:
- header: "Continue?"
- question: "${remaining} gaps remain after iteration ${iteration}/${max_iterations}. Try another fix iteration?"
- options:
  - "Fix again" — Another iteration
  - "Accept as-is" — Move on with remaining gaps

If "Fix again": increment iteration, continue.
If "Accept as-is": BREAK → go to step 5.

**If gaps remain AND iteration >= max_iterations:**
```
Max fix iterations (${max_iterations}) reached. ${remaining} gaps remain.
```
BREAK → go to step 5.

### END LOOP

## 5. Final Status

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): fix loop results" --files "${phase_dir}/${padded_phase}-VALIDATION.md" ${fix_files}
```

### All Gaps Fixed

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PHASE ${phase_number} VALIDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All contracts validated after ${iteration} fix iteration(s).
Phase ${phase_number}: ${phase_name} is COMPLETE.

## Next Phase
${next_phase_info}

/bwb:research ${next_phase}
```

Mark phase complete:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js phase complete "${phase_number}"
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "complete", "Status": "Phase complete"}'
```

### Some Gaps Remain

```
Phase ${phase_number} has ${remaining} known gaps after ${iteration} iteration(s).

| GAP | Contract | Level | Description |
|-----|----------|-------|-------------|
${remaining_table}

## Options
- /bwb:fix ${phase_number} — Try another fix cycle later
- /bwb:contracts ${phase_number} — Revisit contracts if requirements changed
- /bwb:plan ${phase_number} — Replan the phase
- Continue to next phase with known limitations
- /bwb:settings — Adjust max iterations or auto-retry behavior
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "fix", "Status": "${remaining} gaps remaining after ${iteration} iterations"}'
```

</process>

<success_criteria>
- [ ] VALIDATION.md loaded and gaps parsed
- [ ] In auto mode: all gaps fixed without user interaction
- [ ] In manual mode: user selected which gaps to fix
- [ ] bwb-fixer spawned for each gap (parallel)
- [ ] Fix plans created (type: fix, contracts field)
- [ ] Fixes executed with atomic commits
- [ ] FULL re-validation run on ALL contracts each iteration
- [ ] Loop terminates (all fixed, max iterations, or user accepts)
- [ ] VALIDATION.md fully replaced each iteration
- [ ] User routed to next step
</success_criteria>