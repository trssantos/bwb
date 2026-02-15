<purpose>
Automated fix cycle for validation gaps. Reads GAPs from VALIDATION.md, lets user select which to fix, spawns bwb-fixer for targeted fix plans, executes them, and re-validates affected FEATs. Max 3 iterations before escalating.

Flow: Load gaps → User selects → Spawn fixer → Execute fixes → Re-validate affected FEATs → Loop or complete.
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

Parse JSON for: `fixer_model`, `builder_model`, `validator_model`, `commit_docs`, `phase_dir`, `phase_number`, `phase_name`, `padded_phase`, `has_validation`.

**If `has_validation` is false:** Error — run `/bwb:validate ${phase}` first.

## 2. Load Gaps

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

## 3. User Selects Gaps

Use AskUserQuestion (multiSelect: true):
- header: "Fix gaps"
- question: "Which gaps do you want to fix?"
- options: Each gap as an option with severity and description

Store selected gaps.

## 4. Fix Loop (Max 3 Iterations)

Track: `iteration = 1`, `max_iterations = 3`

### 4a. Spawn Fixer Agent(s)

For each selected gap, resolve fixer model:
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

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-fixer.md for your role.\nThen read /Users/dustbit/.claude/agents/bwb-builder.md for execution.\n\n" + fix_prompt,
  subagent_type="general-purpose",
  model="${FIXER_MODEL}",
  description="Fix ${gap_id}"
)
```

### 4b. Collect Fix Results

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

### 4c. Re-validate Affected FEATs Only

Spawn bwb-validator for ONLY the FEATs that had fixes applied:

```bash
VALIDATOR_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-validator --raw)
```

```markdown
<validation_context>
**Phase:** ${phase_number} - ${phase_name}
**Re-validation after fix iteration ${iteration}**

**CONTRACTS (validate ONLY these):**
${affected_feat_entries}

**CONTEXT (for L6):**
${context_content}
</validation_context>

<output>
Update: ${phase_dir}/${padded_phase}-VALIDATION.md
(Merge new results into existing file — update affected FEAT rows, update gap statuses)
</output>
```

### 4d. Check Results

```bash
RESULTS=$(node /Users/dustbit/.claude/bwb/bin/bwb.js validation-status "${phase_dir}/${padded_phase}-VALIDATION.md")
```

**If all selected gaps resolved:**
```
All ${fixed_count} gaps resolved in iteration ${iteration}!
```
Break loop → go to step 5.

**If gaps remain AND iteration < max_iterations:**
```
${remaining} gaps still open after iteration ${iteration}.

| GAP | Status | Notes |
|-----|--------|-------|
${remaining_table}
```

Use AskUserQuestion:
- header: "Continue fixing?"
- question: "${remaining} gaps remain. Try another fix iteration? (${iteration}/${max_iterations})"
- options:
  - "Fix again" — Another iteration
  - "Accept as-is" — Move on with remaining gaps
  - "Escalate" — Need to rethink approach

If "Fix again": increment iteration, go to 4a.
If "Accept as-is": go to step 5.
If "Escalate": suggest `/bwb:discuss ${phase}` to revisit decisions.

**If gaps remain AND iteration >= max_iterations:**
```
Max fix iterations (${max_iterations}) reached. ${remaining} gaps remain.

Consider:
- Revisiting the contracts: /bwb:contracts ${phase_number}
- Replanning: /bwb:plan ${phase_number}
- Accepting remaining gaps as known limitations
```

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
Phase ${phase_number} has ${remaining} known gaps.

These will be tracked in VALIDATION.md for future reference.

## Options
- /bwb:fix ${phase_number} — Try another fix cycle later
- /bwb:contracts ${phase_number} — Revisit contracts if requirements changed
- Continue to next phase with known limitations
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "fix", "Status": "${remaining} gaps remaining"}'
```

</process>

<success_criteria>
- [ ] VALIDATION.md loaded and gaps parsed
- [ ] User selected which gaps to fix
- [ ] bwb-fixer spawned for each selected gap
- [ ] Fix plans created (type: fix, contracts field)
- [ ] Fixes executed with atomic commits
- [ ] Re-validation run on affected FEATs only
- [ ] Loop terminates (all fixed, user accepts, or max iterations)
- [ ] VALIDATION.md updated with fix results
- [ ] User routed to next step
</success_criteria>
