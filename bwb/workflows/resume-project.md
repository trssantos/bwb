<purpose>
Resume work on a BWB project from a previous session. Loads STATE.md for full context restoration, checks for incomplete work, and routes to the correct next action.

Use when: starting a new session, user says "continue", "what's next", "where were we", "resume".
</purpose>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init progress)
```

Parse: `state_exists`, `roadmap_exists`, `project_exists`, `planning_exists`.

**If `planning_exists` is false:** Route to `/bwb:new` or `/bwb:init`.
**If `state_exists` is false:** Offer to reconstruct from existing artifacts.

## 2. Load State

```bash
cat .planning/STATE.md
cat .planning/PROJECT.md
```

**From STATE.md extract:**
- Current position (phase, step, status)
- Progress bar
- Recent decisions
- Blockers/concerns
- Last session info

**From PROJECT.md extract:**
- Project name and core value
- Key constraints

## 3. Check Incomplete Work

```bash
# Check for plans without summaries (incomplete execution)
for plan in .planning/phases/*/*-PLAN.md; do
  summary="${plan/PLAN/SUMMARY}"
  [ ! -f "$summary" ] && echo "Incomplete: $plan"
done 2>/dev/null

# Check for validation with gaps
for val in .planning/phases/*/*-VALIDATION.md; do
  grep -l "result: failed" "$val" 2>/dev/null && echo "Gaps: $val"
done 2>/dev/null
```

## 4. Present Context

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► RESUMING PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{Project Name}** — {core value}

## Where We Left Off

Phase ${phase}/${total}: ${phase_name}
Step: ${step}
Status: ${status}

${If blockers: "Blockers: ${blockers}"}
${If decisions: "Key decisions: ${recent_decisions}"}

${If incomplete plans:
"## Incomplete Work
- ${plan}: execution was interrupted
"}

${If validation gaps:
"## Validation Gaps
- ${phase}: ${gap_count} gaps need fixing
"}
```

## 5. Route to Next Action

Same routing logic as progress workflow:

```
No RESEARCH.md        → /bwb:research {phase}
No CONTEXT.md         → /bwb:discuss {phase}
No CONTRACTS.md       → /bwb:contracts {phase}
No PLANs              → /bwb:plan {phase}
Incomplete PLANs      → /bwb:build {phase}
No VALIDATION.md      → /bwb:validate {phase}
Gaps in VALIDATION    → /bwb:fix {phase}
Phase complete        → /bwb:research {next_phase}
```

Present:

```
## Continue With

${recommendation}

/bwb:{command} ${phase}

/clear first → fresh context window

---

**Other options:**
- /bwb:progress — Full progress overview
- /bwb:quick "task" — Quick tracked task
```

</process>

<success_criteria>
- [ ] STATE.md loaded and parsed
- [ ] Incomplete work detected
- [ ] Context presented clearly
- [ ] Correct next action routed
</success_criteria>
