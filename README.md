# BWB — Build Without Bullshit

**A contract-driven development framework for Claude Code. Every feature gets a behavioral spec. Every build gets validated against it. The loop runs until contracts pass.**

BWB is a meta-prompting and context engineering system that ensures Claude Code doesn't just *write* features — it builds features that actually *work*. No more code that compiles but crashes on first use, routes that exist but can't be reached, or implementations that drift from what you discussed.

Inspired by [**Get Shit Done (GSD)**](https://github.com/glittercowboy/get-shit-done) by TACHES — an incredible framework for spec-driven development with Claude Code. BWB takes GSD's proven patterns (context engineering, plans-as-prompts, atomic commits, wave-based execution) and adds a behavioral contract layer with automated validation on top.

---

## What BWB Does

BWB wraps Claude Code in a structured loop:

1. **You describe what you want** — through guided Q&A and discussion
2. **BWB extracts behavioral contracts** — what must be TRUE from the user's perspective
3. **Claude builds against those contracts** — with coherence checks between build waves
4. **BWB validates what was built** — 6 levels of automated checking, with evidence
5. **Failures get fixed automatically** — targeted fix plans, re-validation, loop until pass

The result: features that work end-to-end, not just code that exists.

---

## The Flow

```
/bwb:new ─── Q&A ─── Research ─── PROJECT.md ─── ROADMAP.md

Per phase:
  /bwb:research    → Investigate tech/approach           → RESEARCH.md
  /bwb:discuss     → Capture decisions (informed by research) → CONTEXT.md
  /bwb:contracts   → Extract behavioral specs            → CONTRACTS.md
  /bwb:plan        → Create plans mapped to contracts    → PLAN.md files
  /bwb:build       → Execute with coherence checks       → SUMMARY.md files
  /bwb:prepare     → Set up deps, mock external services → PREPARATION.md
  /bwb:validate    → 6-level feature validation          → VALIDATION.md
  /bwb:fix         → Targeted fixes, re-validate         → Loop until pass
```

### Additional Entry Points

| Command | Use For |
|---------|---------|
| `/bwb:init` | Onboard an existing project (brownfield) |
| `/bwb:baseline` | Analyze existing codebase, create regression contracts (Phase 00) |
| `/bwb:add` | Add a new phase to an existing roadmap |
| `/bwb:quick "desc"` | Quick task with full contract guarantees in one session |
| `/bwb:progress` | See where you are, route to next action |
| `/bwb:resume` | Restore context from a previous session |
| `/bwb:settings` | Configure model profile, fix loop behavior |

---

## The 6-Level Validation

This is the core of BWB. Every FEAT contract gets checked through 6 levels:

| Level | Question | Catches |
|-------|----------|---------|
| **L1 IMPLEMENTED** | Does code exist for this? | Missing features, stubs, placeholders |
| **L2 ACCESSIBLE** | Can a user reach this? | Dead code, unwired routes, missing navigation |
| **L3 FUNCTIONAL** | Does it actually work? | Logic errors, wrong behavior, incomplete implementation |
| **L4 RESILIENT** | Does it handle failure? | Silent failures, swallowed errors, crashes on edge cases |
| **L5 INTEGRATED** | Does it work with other features? | Broken cross-feature data flow, mismatched types |
| **L6 FAITHFUL** | Does it match what was discussed? | Spec drift, wrong UX choices, ignored decisions |

Each PASS and FAIL comes with evidence — file paths, line numbers, code snippets. No hand-waving.

Failures become GAP entries with severity, proposed fix, and affected files. The fix loop creates targeted plans, executes them, and re-validates only affected FEATs.

---

## Behavioral Contracts

A contract (FEAT entry) is a behavioral specification:

```markdown
### FEAT-03: Draft Saving

**What:** User can save incomplete work and return to it later
**Expected:** Drafts persist across sessions and restore to exact state

**Acceptance Criteria:**
1. Saving a draft preserves all form fields
2. Closing and reopening the app shows the draft
3. Editing a draft updates the existing draft
4. User can discard a draft explicitly

**Source:** Discussion — Data persistence
**Depends:** FEAT-01
```

Contracts are **behavioral and technology-agnostic**. "User can save a draft" — not "AsyncStorage.setItem called." This means validation checks what the code *does*, not how it *looks*.

Every plan's frontmatter maps to contracts:
```yaml
contracts: [FEAT-01, FEAT-03]
```

Every summary reports which contracts were addressed:
```yaml
contracts_addressed: [FEAT-01, FEAT-03]
```

The chain is unbroken: discussion → contracts → plans → build → validate → fix.

---

## Brownfield Support

BWB works on existing projects, not just greenfield:

- **`/bwb:init`** — Detects your tech stack, scans project structure, sets up `.planning/`
- **`/bwb:baseline`** — Analyzes your codebase and extracts behavioral contracts for existing features as Phase 00. This creates a regression safety net — run `/bwb:validate 0` after any phase to catch regressions.

---

## Installation

```bash
npx bwb-cc@latest
```

That's it. The installer copies BWB framework files to `~/.claude/` and you're ready to go.

### Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and set up (`~/.claude/` must exist)
- Node.js 18+

### Manual Install

If you prefer not to use npx:

```bash
git clone https://github.com/trssantos/bwb.git /tmp/bwb-install
cp -r /tmp/bwb-install/bwb ~/.claude/bwb
cp -r /tmp/bwb-install/agents/bwb-*.md ~/.claude/agents/
cp -r /tmp/bwb-install/commands/bwb ~/.claude/commands/bwb
chmod +x ~/.claude/bwb/bin/bwb.js
rm -rf /tmp/bwb-install
```

---

## Commands Reference

### Core Workflow

| Command | Description |
|---------|-------------|
| `/bwb:new` | Initialize a new project (Q&A → research → roadmap) |
| `/bwb:research {phase}` | Research tech/approach for a phase |
| `/bwb:discuss {phase}` | Capture implementation decisions |
| `/bwb:contracts {phase}` | Extract behavioral contracts from decisions |
| `/bwb:plan {phase}` | Create implementation plans mapped to contracts |
| `/bwb:build {phase}` | Execute plans with wave-based parallelization |
| `/bwb:prepare {phase}` | Set up dependencies, mock external services |
| `/bwb:validate {phase}` | Validate features against contracts (6 levels) |
| `/bwb:fix {phase}` | Fix validation gaps with targeted plans |

### Additional Entry Points

| Command | Description |
|---------|-------------|
| `/bwb:init` | Onboard an existing project (brownfield) |
| `/bwb:baseline` | Analyze codebase and create Phase 00 regression baseline |
| `/bwb:add` | Add a new phase to the roadmap |
| `/bwb:quick "description"` | Quick task with contracts + validation in one session |

### Navigation

| Command | Description |
|---------|-------------|
| `/bwb:progress` | Check progress and route to next action |
| `/bwb:resume` | Restore context from previous session |
| `/bwb:settings` | Configure model profile and fix loop behavior |

---

## Project Structure

BWB creates a `.planning/` directory in your project:

```
.planning/
├── PROJECT.md                          # Project vision and requirements
├── ROADMAP.md                          # Phase structure with success criteria
├── STATE.md                            # Project memory (position, decisions)
├── config.json                         # Settings (model_profile, commit_docs)
├── research/                           # Project-level research (from /bwb:new)
└── phases/
    ├── 00-baseline/                    # Legacy baseline (from /bwb:baseline)
    │   └── 00-CONTRACTS.md             # Regression contracts for existing code
    └── 01-auth/
        ├── 01-RESEARCH.md              # Tech/approach investigation
        ├── 01-CONTEXT.md               # Discussion decisions
        ├── 01-CONTRACTS.md             # Behavioral feature specs (FEAT entries)
        ├── 01-01-PLAN.md               # Implementation plan
        ├── 01-01-SUMMARY.md            # Build results
        ├── 01-PREPARATION.md           # Dependency/environment setup
        └── 01-VALIDATION.md            # 6-level validation results + GAPs
```

### Framework Files

```
~/.claude/
├── bwb/
│   ├── bin/bwb.js                      # CLI tool
│   ├── workflows/                      # Workflow orchestrators
│   └── templates/                      # Artifact templates
├── agents/
│   └── bwb-*.md                        # Specialized agents
└── commands/bwb/
    └── *.md                            # Slash command registrations
```

---

## Configuration

BWB has 5 settings in `.planning/config.json`, configurable via `/bwb:settings`:

| Setting | Options | Default | What It Does |
|---------|---------|---------|--------------|
| `model_profile` | `quality` / `balanced` / `budget` | `balanced` | Controls which models agents use |
| `commit_docs` | `true` / `false` | `true` | Whether planning docs get committed to git |
| `search_gitignored` | `true` / `false` | `false` | Whether to search ignored files during research |
| `fix_max_iterations` | `1`-`10` | `5` | Max fix-validate loops before stopping |
| `fix_auto_retry` | `true` / `false` | `true` | Auto-retry fix loop or ask between iterations |

### Model Profiles

| Agent | Quality | Balanced | Budget |
|-------|---------|----------|--------|
| bwb-researcher | opus | sonnet | haiku |
| bwb-roadmapper | opus | sonnet | sonnet |
| bwb-planner | opus | opus | sonnet |
| bwb-builder | opus | sonnet | sonnet |
| bwb-validator | opus | sonnet | haiku |
| bwb-fixer | opus | sonnet | sonnet |
| bwb-analyzer | opus | sonnet | haiku |
| bwb-preparer | sonnet | sonnet | haiku |

---

## Philosophy

### Why Contracts?

Claude Code produces features that look correct but break on use. The code exists, the routes exist, the components exist — but the button doesn't wire to the handler, the API returns the wrong shape, or the error path silently swallows the failure.

Behavioral contracts fix this by specifying what must be TRUE from the user's perspective, then checking it systematically through 6 levels. Not "does code exist?" but "can a user actually do this thing, and does it work when things go wrong?"

### Research Before Discussion

Research happens *before* discussion. This means when you sit down to discuss implementation decisions, the research findings are already available: "Research found library X has limitation Y — how should we handle this?" Better-informed discussions → better contracts → better builds.

### Regression Safety

For brownfield projects, `/bwb:baseline` extracts contracts from your existing codebase. Run `/bwb:validate 0` after any phase to catch regressions — no manual testing needed.

---

## License

MIT

---

## Acknowledgments

BWB exists because [GSD](https://github.com/glittercowboy/get-shit-done) exists. The context engineering, plans-as-prompts philosophy, atomic commits, wave-based execution, and practical ethos are all inherited from GSD. If you like BWB, go star GSD — it's the foundation this is built on.
