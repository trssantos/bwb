<purpose>
Execute all plans in a phase using wave-based parallel execution with coherence checks against CONTRACTS.md between waves. Orchestrator stays lean — delegates plan execution to bwb-builder subagents.

Flow: Initialize → Discover plans → Group waves → Execute waves (with coherence checks) → Collect results → Route to /bwb:validate.

Key BWB difference from GSD: After each wave, read SUMMARYs and compare against CONTRACTS.md. If a summary reports decisions that contradict a contract → STOP, alert user. This is lightweight (not full validation), catches gross drift early.
</purpose>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full context. Orchestrator: discover plans → analyze deps → group waves → spawn agents → coherence check → collect results.
</core_principle>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init execute-phase "${PHASE_ARG}")
```

Parse JSON for: `executor_model`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`.

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found. Run `/bwb:plan ${phase}` first.

Resolve executor model:
```bash
EXECUTOR_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-builder --raw)
```

## 2. Discover and Group Plans

Load plan inventory:

```bash
PLAN_INDEX=$(node /Users/dustbit/.claude/bwb/bin/bwb.js phase-plan-index "${phase_number}")
```

Parse: `plans[]` (each with `id`, `wave`, `autonomous`, `objective`, `files_modified`, `task_count`, `has_summary`, `contracts`), `waves` (map of wave → plan IDs), `incomplete`.

**Filter:** Skip plans where `has_summary: true` (already executed).

Report:
```
## Execution Plan

**Phase ${phase_number}: ${phase_name}** — ${total_plans} plans across ${wave_count} waves

| Wave | Plans | Contracts | What it builds |
|------|-------|-----------|----------------|
| 1 | 01-01, 01-02 | FEAT-01,02,03 | {from objectives} |
| 2 | 01-03 | FEAT-04,05 | {from objectives} |
```

## 3. Load Contracts for Coherence Checks

```bash
CONTRACTS=$(cat "${phase_dir}/${padded_phase}-CONTRACTS.md")
```

Parse FEAT entries for coherence checking between waves.

## 4. Execute Waves

Execute each wave in sequence. Within a wave, plans execute in parallel.

**For each wave:**

### 4a. Describe What's Being Built

Read each plan's objective. Present to user:
```
---
## Wave ${N}

**${plan_id}: ${plan_name}**
${2-3 sentences: what this builds, why it matters}
Contracts: ${FEAT IDs}

Spawning ${count} agent(s)...
---
```

### 4b. Spawn bwb-builder Agents

Pass paths only — builders read files with their fresh context.

```
Task(
  subagent_type="general-purpose",
  model="${EXECUTOR_MODEL}",
  prompt="
    <objective>
    Execute plan ${plan_number} of phase ${phase_number}-${phase_name}.
    Commit each task atomically. Create SUMMARY.md. Update STATE.md.
    </objective>

    <execution_context>
    First read /Users/dustbit/.claude/agents/bwb-builder.md for your role.
    Then read /Users/dustbit/.claude/bwb/templates/summary.md for output format.
    </execution_context>

    <files_to_read>
    - Plan: ${phase_dir}/${plan_file}
    - State: .planning/STATE.md
    - Config: .planning/config.json
    </files_to_read>
  ",
  description="Build ${plan_id}"
)
```

### 4c. Wait for All Agents in Wave

### 4d. Spot-Check Results

For each SUMMARY.md produced:
- Verify file exists on disk
- Check `git log --oneline --grep="${phase}-${plan}"` returns commits
- Read summary for `## Self-Check` results

If spot-check fails: report which plan failed, ask "Retry?" or "Continue?"

### 4e. Coherence Check (BWB Innovation)

After each wave, read the new SUMMARYs and compare against CONTRACTS.md:

1. For each SUMMARY, read `contracts_addressed` from frontmatter
2. For each addressed contract, read the acceptance criteria
3. Read the summary's "What Was Built" section
4. Check: does the summary description contradict any acceptance criterion?
5. Check: does the summary report decisions that conflict with CONTEXT.md?

**If contradiction found:**
```
COHERENCE WARNING

Plan ${plan_id} reports: "${summary description}"
But contract FEAT-${NN} says: "${acceptance criterion}"

These may conflict. Please review before continuing.
```

Use AskUserQuestion:
- "Continue anyway" — Accept the deviation
- "Stop and investigate" — Halt execution

**If no contradictions:** Report wave completion and continue.

### 4f. Report Wave Completion

```
---
## Wave ${N} Complete

**${plan_id}: ${plan_name}**
${What was built — from SUMMARY.md}
${Notable deviations, if any}

${If more waves: what this enables for next wave}
---
```

### 4g. Proceed to Next Wave

## 5. Phase Build Complete

After all waves:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► BUILD COMPLETE — Phase ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans executed: ${completed}/${total}
Contracts addressed: ${contracts_list}
Coherence issues: ${issue_count}
```

## 6. Route to Validation

```
Build complete for Phase ${phase_number}: ${phase_name}.

---

## Next Up

Validate features against contracts (6-level check)

/bwb:validate ${phase_number}

/clear first → fresh context window
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "build", "Status": "Build complete"}'
```

</process>

<success_criteria>
- [ ] All incomplete plans discovered and grouped by wave
- [ ] Each plan executed by bwb-builder agent
- [ ] Spot-checks pass for each SUMMARY.md
- [ ] Coherence check run after each wave (vs CONTRACTS.md)
- [ ] No unresolved contradictions
- [ ] User routed to /bwb:validate
</success_criteria>
