<purpose>
BWB's environment preparation orchestrator. Scans built code for external dependencies, auto-sets up what it can, asks the user about each external service (configure real / mock / skip), and generates test fixtures so validation can verify logic without real credentials.

Flow: Initialize → Check existing → Load context → Spawn preparer → Verify results → Commit → Route to /bwb:validate.
</purpose>

<required_reading>
- `.planning/phases/XX-name/XX-CONTRACTS.md` — what features exist
- `.planning/phases/XX-name/XX-*-SUMMARY.md` — what was built
</required_reading>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init prepare "$ARGUMENTS")
```

Parse JSON for: `preparer_model`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `padded_phase`, `has_contracts`, `has_summaries`, `has_preparation`, `detected_types`, `has_env`, `has_env_example`, `has_test_dir`.

**If `phase_found` is false:** Error — phase directory not found.
**If `has_contracts` is false:** Error — no contracts found. Run `/bwb:contracts ${phase}` first.
**If `has_summaries` is false:** Error — no build summaries found. Run `/bwb:build ${phase}` first.

Resolve preparer model:
```bash
PREPARER_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-preparer --raw)
```

## 2. Check Existing Preparation

**If `has_preparation` is true:**

Use AskUserQuestion:
- header: "Existing prep"
- question: "Phase ${phase_number} already has preparation results. What do you want to do?"
- options:
  - "Re-prepare" — Run fresh preparation
  - "View results" — Show existing PREPARATION.md
  - "Skip" — Keep existing results and route to validate

If "View results": Read and display the existing PREPARATION.md, then ask if they want to re-prepare or continue to validate.
If "Skip": Route directly to `/bwb:validate ${phase_number}`.

## 3. Load Context

```bash
# What features exist
CONTRACTS=$(cat "${phase_dir}/${padded_phase}-CONTRACTS.md" 2>/dev/null)

# What was built
SUMMARIES=""
for summary in ${phase_dir}/${padded_phase}-*-SUMMARY.md; do
  SUMMARIES="${SUMMARIES}\n$(cat "$summary")"
done
```

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PREPARING PHASE ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detected project type: ${detected_types}
Existing .env: ${has_env}
Test directory: ${has_test_dir}
```

## 4. Spawn Preparer Agent

Preparer prompt:

```markdown
<preparation_context>
**Phase:** ${phase_number} - ${phase_name}

**Project types detected:** ${detected_types}
**Has .env:** ${has_env}
**Has .env.example:** ${has_env_example}
**Has test directory:** ${has_test_dir}

**CONTRACTS (what features exist):**
${contracts_content}

**BUILD SUMMARIES (what was built):**
${summaries_content}
</preparation_context>

<output>
Write to: ${phase_dir}/${padded_phase}-PREPARATION.md
Template: /Users/dustbit/.claude/bwb/templates/preparation.md
</output>
```

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-preparer.md for your role and instructions.\n\n" + preparer_prompt,
  subagent_type="general-purpose",
  model="${PREPARER_MODEL}",
  description="Prepare Phase ${phase_number}"
)
```

## 5. Verify Results

After preparer returns:

1. Check PREPARATION.md exists at `${phase_dir}/${padded_phase}-PREPARATION.md`
2. If mocks were generated, verify `test/mocks/manifest.json` exists (or equivalent)
3. Read PREPARATION.md frontmatter for status

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PREPARATION COMPLETE — Phase ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ${status}
Auto-setup actions: ${auto_setup_count}
External deps: ${external_deps_count}
  Configured: ${configured_count}
  Mocked: ${mocked_count}
  Explained: ${explained_count}
  Pending: ${pending_count}
```

**Safety check:** If `.env` was created or modified, verify it is listed in `.gitignore`. If not, add `.env` to `.gitignore` before committing.

## 6. Commit

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): preparation report" --files "${phase_dir}/${padded_phase}-PREPARATION.md"
```

If mock files were generated, also commit those:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "test(${padded_phase}): mock fixtures for validation" --files "test/mocks/"
```

## 7. Route to Validation

```
Preparation complete for Phase ${phase_number}: ${phase_name}.

---

## Next Up

Validate features against contracts (6-level check)

/bwb:validate ${phase_number}

/clear first → fresh context window
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "prepare", "Status": "Preparation complete"}'
```

</process>

<success_criteria>
- [ ] CONTRACTS.md and SUMMARY files loaded
- [ ] Project type detected
- [ ] bwb-preparer spawned with full context
- [ ] PREPARATION.md written with dependency status
- [ ] Mock fixtures generated if user chose to mock services
- [ ] Results presented to user
- [ ] Routed to /bwb:validate
</success_criteria>
