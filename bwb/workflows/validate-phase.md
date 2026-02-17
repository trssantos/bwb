<purpose>
BWB's core validation orchestrator. Checks every FEAT contract through 6 levels (L1 IMPLEMENTED → L6 FAITHFUL). Produces VALIDATION.md with per-feature results and GAP entries for failures. Routes to /bwb:fix if gaps found, or marks phase complete if all pass.

Flow: Initialize → Load contracts → Load context → Spawn validator(s) → Generate VALIDATION.md → Route based on results.
</purpose>

<required_reading>
- `.planning/phases/XX-name/XX-CONTRACTS.md` — what to validate
- `.planning/phases/XX-name/XX-CONTEXT.md` — for L6 faithfulness checks
- `.planning/phases/XX-name/XX-*-SUMMARY.md` — what was built
</required_reading>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init phase-op "$ARGUMENTS")
```

Parse JSON for: `validator_model`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `padded_phase`, `has_contracts`, `has_validation`.

**If `has_contracts` is false:** Error — no contracts to validate against.

Resolve validator model:
```bash
VALIDATOR_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-validator --raw)
```

## 2. Load Contracts

```bash
CONTRACTS=$(node /Users/dustbit/.claude/bwb/bin/bwb.js contracts analyze "${phase_dir}/${padded_phase}-CONTRACTS.md")
```

Parse: FEAT count, FEAT IDs, acceptance criteria per FEAT.

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► VALIDATING PHASE ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contracts to validate: ${feat_count}
```

## 3. Check Existing Validation

**If `has_validation` is true:**

Use AskUserQuestion:
- header: "Existing validation"
- question: "Phase ${phase_number} already has validation results. What do you want to do?"
- options:
  - "Re-validate" — Run fresh validation
  - "View results" — Show existing validation
  - "Skip" — Keep existing results

## 4. Load Supporting Context

First, check if this is a baseline phase:
```bash
FRONTMATTER=$(node /Users/dustbit/.claude/bwb/bin/bwb.js frontmatter get "${phase_dir}/${padded_phase}-CONTRACTS.md")
```

Parse `baseline` field from frontmatter. If `baseline: true`, this is a Phase 00 baseline.

**If baseline phase:** Skip CONTEXT.md and SUMMARY.md loading — they don't exist for Phase 00. Set `is_baseline=true`.

**If normal phase:**
```bash
# For L6 faithfulness checks
CONTEXT=$(cat "${phase_dir}/${padded_phase}-CONTEXT.md" 2>/dev/null)

# What was built
SUMMARIES=""
for summary in ${phase_dir}/${padded_phase}-*-SUMMARY.md; do
  SUMMARIES="${SUMMARIES}\n$(cat "$summary")"
done

# Dependency preparation status (from /bwb:prepare)
PREPARATION=$(cat "${phase_dir}/${padded_phase}-PREPARATION.md" 2>/dev/null)
```

## 5. Spawn Validator Agent(s)

**Strategy:** For 1-3 FEATs, spawn 1 validator. For 4+ FEATs, consider 2 validators (split FEATs between them).

Validator prompt:

**If baseline phase (`is_baseline=true`):**

```markdown
<validation_context>
**Phase:** ${phase_number} - ${phase_name}
**Baseline:** true — contracts derived from existing code, not discussion

**CONTRACTS (validate these):**
${contracts_content}

**CONTEXT (for L6 faithfulness):**
N/A — baseline phase. Auto-PASS L6 for all FEATs.

**BUILD SUMMARIES (what was built):**
N/A — baseline phase. Code already exists.

**PREPARATION (dependency status, mocked services):**
${preparation_content}
</validation_context>

<output>
Write to: ${phase_dir}/${padded_phase}-VALIDATION.md
</output>
```

**If normal phase:**

```markdown
<validation_context>
**Phase:** ${phase_number} - ${phase_name}

**CONTRACTS (validate these):**
${contracts_content}

**CONTEXT (for L6 faithfulness):**
${context_content}

**BUILD SUMMARIES (what was built):**
${summaries_content}

**PREPARATION (dependency status, mocked services):**
${preparation_content}
</validation_context>

<output>
Write to: ${phase_dir}/${padded_phase}-VALIDATION.md
</output>
```

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-validator.md for your role and instructions.\n\n" + validator_prompt,
  subagent_type="general-purpose",
  model="${VALIDATOR_MODEL}",
  description="Validate Phase ${phase_number}"
)
```

## 6. Process Results

After validator returns, read VALIDATION.md:

```bash
RESULTS=$(node /Users/dustbit/.claude/bwb/bin/bwb.js validation-status "${phase_dir}/${padded_phase}-VALIDATION.md")
```

Parse: total FEATs, passed, failed, gap count, gap details.

## 7. Present Results

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► VALIDATION RESULTS — Phase ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| FEAT | L1 | L2 | L3 | L4 | L5 | L6 | Result |
|------|----|----|----|----|----|----|--------|
${results_table}

Passed: ${passed}/${total}
Gaps: ${gap_count}
```

## 8. Commit

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): validation results" --files "${phase_dir}/${padded_phase}-VALIDATION.md"
```

## 9. Route Based on Results

### All Passed

**If baseline phase (`is_baseline=true`):**

Do NOT mark phase as "complete" or route to next phase. Instead:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► BASELINE INTACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All ${total} baseline contracts validated. No regressions.

Run /bwb:validate 0 again after any phase to check for regressions.
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "validate", "Status": "Baseline intact — no regressions"}'
```

**If normal phase:**

```
All ${total} contracts validated for Phase ${phase_number}!

Phase ${phase_number}: ${phase_name} is COMPLETE.

---

## Next Phase

${next_phase_info}

/bwb:research ${next_phase}

/clear first → fresh context window
```

Mark phase complete:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js phase complete "${phase_number}"
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "complete", "Status": "Phase complete"}'
```

### Gaps Found

```
${gap_count} gaps found in ${failed} contracts.

| GAP | Contract | Level | Severity | Description |
|-----|----------|-------|----------|-------------|
${gap_table}

---

## Next Step

Fix validation gaps

/bwb:fix ${phase_number}

/clear first → fresh context window
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "validate", "Status": "${gap_count} gaps found"}'
```

</process>

<success_criteria>
- [ ] CONTRACTS.md loaded and all FEATs identified
- [ ] CONTEXT.md loaded for L6 checks
- [ ] SUMMARY.md files loaded for context
- [ ] bwb-validator spawned with full context
- [ ] VALIDATION.md written with per-FEAT, per-level results
- [ ] Results presented to user
- [ ] Routed correctly: all pass → next phase, gaps → /bwb:fix
</success_criteria>
