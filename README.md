# BWB — Build, Validate, Wire

**A contract-driven development framework for Claude Code. Every feature gets a behavioral spec. Every build gets validated against it. The loop runs until contracts pass.**

BWB is a meta-prompting and context engineering system that ensures Claude Code doesn't just *write* features — it builds features that actually *work*. No more code that compiles but crashes on first use, routes that exist but can't be reached, or implementations that drift from what you discussed.

---

## Inspired by GSD

BWB is built on the shoulders of [**Get Shit Done (GSD)**](https://github.com/glittercowboy/get-shit-done) by TACHES — an incredible framework that solved context rot, multi-agent orchestration, and spec-driven development for Claude Code. GSD is battle-tested, actively maintained, and used by engineers at Amazon, Google, Shopify, and Webflow. **If you haven't tried it, [go check it out](https://github.com/glittercowboy/get-shit-done).** It's awesome.

BWB takes GSD's proven patterns (context engineering, plans-as-prompts, atomic commits, wave-based execution) and adds a contract layer on top. Where GSD verifies through manual UAT after building, BWB extracts behavioral contracts *before* building and validates against them *automatically* after.

---

## How BWB Differs from GSD

| | GSD | BWB |
|---|---|---|
| **Spec format** | `must_haves` (truths, artifacts, key links) | `CONTRACTS.md` with FEAT entries (What/Expected/Acceptance) |
| **Validation** | Manual UAT (`/gsd:verify-work`) | Automated 6-level validation (`/bwb:validate`) |
| **When validation happens** | After building, conversational | After building, systematic (L1-L6 per feature) |
| **Fix cycle** | Re-plan from verification gaps | Targeted fix loop with re-validation (max 3 iterations) |
| **Discussion → Planning** | discuss → plan (research bundled in plan) | research → discuss → contracts → plan (each step separate) |
| **Research timing** | Bundled into plan-phase | Standalone step before discussion |
| **Contract extraction** | N/A | Dedicated step: decisions + criteria → behavioral FEATs |
| **Coherence checks** | N/A | Between build waves, SUMMARYs checked against contracts |
| **Entry points** | new-project, execute/plan | new, init (brownfield), add (phase), quick (tracked task) |
| **Milestones** | Yes (multi-milestone lifecycle) | No (simpler — phases only) |
| **Config options** | 8+ toggles | 3 settings (model_profile, commit_docs, search_gitignored) |

**The core idea:** GSD ensures Claude builds what was planned. BWB ensures what was planned actually works when users touch it.

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
  /bwb:validate    → 6-level feature validation          → VALIDATION.md
  /bwb:fix         → Targeted fixes, re-validate         → Loop until pass
```

### Additional Entry Points

| Command | Use For |
|---------|---------|
| `/bwb:init` | Onboard an existing project (brownfield) |
| `/bwb:add` | Add a new phase to an existing roadmap |
| `/bwb:quick "desc"` | Quick task with full contract guarantees in one session |
| `/bwb:progress` | See where you are, route to next action |
| `/bwb:resume` | Restore context from a previous session |

---

## The 6-Level Validation

This is the payoff. Every FEAT contract gets checked through 6 levels:

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

The key innovation. A contract (FEAT entry) is a behavioral specification:

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

## Installation

BWB is a set of files that live in your `~/.claude/` directory.

```bash
# Clone the repo
git clone https://github.com/trssantos/bwb.git /tmp/bwb-install

# Copy framework files
cp -r /tmp/bwb-install/bwb ~/.claude/bwb
cp -r /tmp/bwb-install/agents/bwb-*.md ~/.claude/agents/
cp -r /tmp/bwb-install/commands/bwb ~/.claude/commands/bwb

# Make CLI executable
chmod +x ~/.claude/bwb/bin/bwb.js

# Verify
node ~/.claude/bwb/bin/bwb.js generate-slug "test install"

# Clean up
rm -rf /tmp/bwb-install
```

### Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js 18+
- Git

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
| `/bwb:validate {phase}` | Validate features against contracts (6 levels) |
| `/bwb:fix {phase}` | Fix validation gaps with targeted plans |

### Additional Entry Points

| Command | Description |
|---------|-------------|
| `/bwb:init` | Onboard an existing project (brownfield) |
| `/bwb:add` | Add a new phase to the roadmap |
| `/bwb:quick "description"` | Quick task with contracts + validation in one session |

### Navigation

| Command | Description |
|---------|-------------|
| `/bwb:progress` | Check progress and route to next action |
| `/bwb:resume` | Restore context from previous session |

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
    └── 01-auth/
        ├── 01-RESEARCH.md              # Tech/approach investigation
        ├── 01-CONTEXT.md               # Discussion decisions
        ├── 01-CONTRACTS.md             # Behavioral feature specs (FEAT entries)
        ├── 01-01-PLAN.md               # Implementation plan
        ├── 01-01-SUMMARY.md            # Build results
        └── 01-VALIDATION.md            # 6-level validation results + GAPs
```

### Framework Files

```
~/.claude/
├── bwb/
│   ├── bin/bwb.js                      # CLI tool (~2400 lines)
│   ├── workflows/                      # 13 workflow orchestrators
│   └── templates/                      # 7 artifact templates
├── agents/
│   └── bwb-*.md                        # 6 specialized agents
└── commands/bwb/
    └── *.md                            # 13 slash command registrations
```

---

## Configuration

BWB has 3 settings in `.planning/config.json`:

| Setting | Options | Default | What It Does |
|---------|---------|---------|--------------|
| `model_profile` | `quality` / `balanced` / `budget` | `balanced` | Controls which models agents use |
| `commit_docs` | `true` / `false` | `true` | Whether planning docs get committed to git |
| `search_gitignored` | `true` / `false` | `false` | Whether to search ignored files during research |

### Model Profiles

| Agent | Quality | Balanced | Budget |
|-------|---------|----------|--------|
| bwb-researcher | opus | sonnet | haiku |
| bwb-roadmapper | opus | sonnet | sonnet |
| bwb-planner | opus | opus | sonnet |
| bwb-builder | opus | sonnet | sonnet |
| bwb-validator | opus | sonnet | haiku |
| bwb-fixer | opus | sonnet | sonnet |

---

## Philosophy

### Why Contracts?

Claude Code produces features that look correct but break on use. The code exists, the routes exist, the components exist — but the button doesn't wire to the handler, the API returns the wrong shape, or the error path silently swallows the failure.

GSD's `must_haves` (observable truths, artifacts, key links) are excellent for ensuring the right things get built. But they verify *structure*, not *behavior*. BWB adds a behavioral layer: what must be TRUE from the user's perspective, checked systematically.

### Anti-Enterprise

Same philosophy as GSD — no team coordination, sprint ceremonies, stakeholder management, or documentation for documentation's sake. BWB is for one person (you) and one builder (Claude). Phases are buckets of work, not project management artifacts.

### Research Before Discussion

In GSD, research is bundled into plan-phase. In BWB, research happens *before* discussion. This means when you sit down to discuss implementation decisions, the research findings are already available: "Research found library X has limitation Y — how should we handle this?" Better-informed discussions → better contracts → better builds.

---

## License

MIT

---

## Acknowledgments

BWB exists because [GSD](https://github.com/glittercowboy/get-shit-done) exists. The context engineering, plans-as-prompts philosophy, atomic commits, wave-based execution, and anti-enterprise ethos are all inherited from GSD. BWB just adds a contract layer and automated validation on top. If you like BWB, go star GSD — it's the foundation this is built on.
