<purpose>
Create executable phase plans (PLAN.md files) mapped to behavioral contracts. Plans are the bridge between contracts (what must be true) and execution (making it true).

Flow: Initialize → Load contracts → Check existing plans → Spawn planner → Verify contract coverage → Present plans → Route to /bwb:build.

Key difference from GSD: Planner reads CONTRACTS.md as primary input. Every PLAN.md frontmatter includes `contracts: [FEAT-01, ...]`. After plans are created, contract coverage is verified: every FEAT must be addressed by at least one plan.
</purpose>

<required_reading>
- `.planning/phases/XX-name/XX-CONTRACTS.md` — behavioral contracts (PRIMARY input)
- `.planning/phases/XX-name/XX-CONTEXT.md` — user decisions
- `.planning/phases/XX-name/XX-RESEARCH.md` — tech approach
- `.planning/ROADMAP.md` — phase goal
</required_reading>

<process>

## 1. Initialize

Load all context:

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init phase-op "$ARGUMENTS")
```

Parse JSON for: `planner_model`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_contracts`, `has_plans`, `plan_count`.

**If `phase_found` is false:** Error — phase not in roadmap.
**If `has_contracts` is false:** Error — run `/bwb:contracts ${phase}` first.

Resolve planner model:
```bash
PLANNER_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-planner --raw)
```

## 2. Load Phase Context

Read all phase artifacts:

```bash
# Primary input
CONTRACTS=$(cat "${phase_dir}/${padded_phase}-CONTRACTS.md")

# Supporting context
CONTEXT=$(cat "${phase_dir}/${padded_phase}-CONTEXT.md" 2>/dev/null)
RESEARCH=$(cat "${phase_dir}/${padded_phase}-RESEARCH.md" 2>/dev/null)
ROADMAP=$(cat .planning/ROADMAP.md)
STATE=$(cat .planning/STATE.md 2>/dev/null)
```

## 3. Check Existing Plans

**If `has_plans` is true:**

Use AskUserQuestion:
- header: "Existing plans"
- question: "Phase ${phase_number} already has ${plan_count} plan(s). What do you want to do?"
- options:
  - "Add more plans" — Keep existing, create additional
  - "View existing" — Show current plans
  - "Replan from scratch" — Delete existing and recreate

If "Replan": Delete existing PLAN.md files, continue.
If "View": Show plan summaries, then offer add/replan/skip.

## 4. Spawn bwb-planner Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PLANNING PHASE ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Planner prompt:

```markdown
<planning_context>
**Phase:** ${phase_number} - ${phase_name}

**CONTRACTS (PRIMARY INPUT):**
${contracts_content}

**USER DECISIONS (CONTEXT.md):**
IMPORTANT: Locked decisions are NON-NEGOTIABLE.
- Decisions = LOCKED — honor exactly
- Claude's Discretion = Freedom — make implementation choices
- Deferred Ideas = Out of scope — do NOT include

${context_content}

**RESEARCH:**
${research_content}

**ROADMAP:**
${roadmap_section}

**STATE:**
${state_content}
</planning_context>

<downstream_consumer>
Output consumed by /bwb:build. Plans need:
- Frontmatter with `contracts: [FEAT-01, ...]` field
- Tasks in XML format with <done> mapped to contract criteria
- Verification criteria mapped to acceptance criteria
</downstream_consumer>

<output>
Write PLAN.md files to: ${phase_dir}/
Naming: ${padded_phase}-{NN}-PLAN.md (e.g., 01-01-PLAN.md, 01-02-PLAN.md)
</output>
```

```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-planner.md for your role and instructions.\n\n" + planner_prompt,
  subagent_type="general-purpose",
  model="${PLANNER_MODEL}",
  description="Plan Phase ${phase_number}"
)
```

## 5. Verify Contract Coverage

After planner returns, verify every FEAT is covered:

```bash
COVERAGE=$(node /Users/dustbit/.claude/bwb/bin/bwb.js contracts analyze "${phase_dir}/${padded_phase}-CONTRACTS.md")
```

Parse FEAT IDs from contracts. Then check each PLAN.md frontmatter for `contracts` field:

```bash
for plan in ${phase_dir}/${padded_phase}-*-PLAN.md; do
  node /Users/dustbit/.claude/bwb/bin/bwb.js frontmatter get "$plan" contracts
done
```

**If gaps:** FEATs not covered by any plan → warn user, offer: create additional plan, accept gap, or replan.

## 6. Validate Plan Structure

For each plan file:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js verify plan-structure "${plan_file}"
```

Fix any structural issues (missing fields, malformed frontmatter).

## 7. Present Plans

Display plan summary:

```
Plans created for Phase ${phase_number}: ${phase_name}

| Plan | Wave | Contracts | Tasks | Description |
|------|------|-----------|-------|-------------|
| 01 | 1 | FEAT-01, FEAT-02 | 3 | {objective summary} |
| 02 | 1 | FEAT-03 | 2 | {objective summary} |
| 03 | 2 | FEAT-04, FEAT-05 | 2 | {objective summary} |

Contract coverage: ${covered}/${total} FEATs mapped
```

## 8. Commit

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): create implementation plans" --files ${plan_files}
```

## 9. Route to Build

```
Plans ready for Phase ${phase_number}: ${phase_name}

${plan_count} plans across ${wave_count} waves
Contract coverage: ${covered}/${total} FEATs

---

## Next Up

/bwb:build ${phase_number}

/clear first → fresh context window
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "plan", "Status": "Plans created"}'
```

</process>

<success_criteria>
- [ ] CONTRACTS.md loaded as primary input
- [ ] CONTEXT.md and RESEARCH.md loaded for context
- [ ] Existing plans checked (offer replan/add/skip)
- [ ] bwb-planner spawned with full context
- [ ] PLAN.md files created with contracts field in frontmatter
- [ ] Contract coverage verified: 100% of FEATs mapped
- [ ] Plan structure validated
- [ ] Plans committed
- [ ] User routed to /bwb:build
</success_criteria>
