<purpose>
Check project progress, summarize recent work, and intelligently route to the next action based on where the project is in the BWB flow. Provides situational awareness before continuing work.

BWB routing understands the expanded step set: research → discuss → contracts → plan → build → validate → fix → complete.
</purpose>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init progress)
```

Parse: `project_exists`, `roadmap_exists`, `state_exists`, `phases`, `current_phase`, `next_phase`, `completed_count`, `phase_count`.

**If `project_exists` is false:**
```
No planning structure found.

Run /bwb:new to start a new project.
Run /bwb:init to onboard an existing project.
```
Exit.

## 2. Load Context

```bash
cat .planning/STATE.md
ROADMAP=$(node /Users/dustbit/.claude/bwb/bin/bwb.js roadmap analyze)
```

Parse STATE.md for: current phase, step, status, progress.
Parse roadmap analysis for: all phases with disk status.

## 3. Gather Recent Work

Find 2-3 most recent SUMMARY.md files to show what's been done recently.

## 4. Present Progress

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PROJECT PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{Project Name}** — {core value}

Phase ${current}/${total}: ${phase_name}
Step: ${step} | Status: ${status}

Progress: ${progress_bar}

Recent:
${recent_summaries}

| Phase | Status | Step |
|-------|--------|------|
${phase_table}
```

## 5. Route to Next Action

Determine the next action based on current phase artifacts:

```
No .planning/         → /bwb:new or /bwb:init
No RESEARCH.md        → /bwb:research {phase}
No CONTEXT.md         → /bwb:discuss {phase}
No CONTRACTS.md       → /bwb:contracts {phase}
No PLANs              → /bwb:plan {phase}
Incomplete PLANs      → /bwb:build {phase}
No VALIDATION.md      → /bwb:validate {phase}
Gaps in VALIDATION    → /bwb:fix {phase}
Phase complete        → /bwb:research {next_phase}
All phases complete   → Project complete!
```

Present the routing:

```
## Next Up

{reason}: /bwb:{command} {phase}

/clear first → fresh context window
```

</process>

<success_criteria>
- [ ] Project context loaded
- [ ] Progress displayed clearly
- [ ] Correct next action identified
- [ ] User knows what to do next
</success_criteria>
