<purpose>
Initialize a new BWB project from scratch: deep questioning → research → PROJECT.md →
ROADMAP.md → STATE.md. For existing codebases, use /bwb:init instead.

Flow: Setup → Brownfield check → Questioning → PROJECT.md → Config → Research (2 parallel) →
Roadmap → Commit & route to /bwb:research 1.
</purpose>

<required_reading>
No prior files required — this is the entry point for new projects.
</required_reading>

<process>

## 1. Setup & Environment Check

Run the initialization command to gather environment context:

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init new-project)
```

Parse the returned JSON for: `researcher_model`, `roadmapper_model`, `commit_docs`,
`project_exists`, `planning_exists`, `has_existing_code`, `is_brownfield`, `has_git`.

**Guards and setup:**
- If `project_exists` is true: abort — tell user to use `/bwb:progress` or `/bwb:research {phase}`
- If `has_git` is false: run `git init`
- If `planning_exists` is false: create `.planning/` and `.planning/research/`

## 2. Brownfield Detection

If `is_brownfield` is true, surface via AskUserQuestion:

> I see existing source code in this directory. **new-project** is for greenfield starts.
> For existing codebases, `/bwb:init` maps your code first.
>
> **Switch to `/bwb:init`?** (Yes = recommended / No = continue as greenfield)

If yes, stop and direct to `/bwb:init`. If no, proceed — user knows best.

## 3. Deep Questioning

Display the workflow banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Open with the core question via AskUserQuestion:

> **What do you want to build?**

Then follow their response with deeper questioning. The goal is to extract enough context
to write a strong PROJECT.md. Use AskUserQuestion for each follow-up. Dig into these areas:

**Motivation & vision:**
- What excited them about this idea? What problem sparked it?
- Who is the user? What does their day look like without this tool?
- What does success look like in 3 months? In 1 year?

**Scope & boundaries:**
- What is the smallest version that would be useful?
- What are they explicitly NOT building? (Prevent scope creep early)
- Are there existing tools they're replacing or complementing?

**Technical shape:**
- Do they have a preferred tech stack, or should research determine it?
- Are there hard constraints? (Platform, language, hosting, budget)
- Any integrations or external services they know they'll need?

**Challenge vagueness:**
- If they say "simple" — ask what specifically makes it simple
- If they say "like X but better" — ask which parts of X and what "better" means
- If they use jargon — confirm shared understanding

**Surface assumptions:**
- What are they taking for granted that might not be true?
- Where are the edges? What happens when things go wrong?
- What would make them abandon this project?

Continue questioning until you have clarity on:
1. What the product IS (description + core value)
2. What the product DOES (5-15 concrete requirements)
3. What the product does NOT do (explicit boundaries)
4. Hard constraints on implementation
5. Key decisions already made

**Decision gate.** When you have enough material, present a brief summary and ask
via AskUserQuestion:

> Here's what I've captured:
>
> **{Project Name}** — {one-line description}
>
> Core value: {the one thing that must work}
>
> Key requirements:
> - {requirement 1}
> - {requirement 2}
> - ...
>
> Constraints: {list}
>
> **Ready to create PROJECT.md?** I can also dig deeper on any area first.

Wait for explicit confirmation before proceeding.

## 4. Write PROJECT.md

Synthesize the questioning into `.planning/PROJECT.md` using the template at
`/Users/dustbit/.claude/bwb/templates/project.md`.

Fill in each section:
- **What This Is** — 2-3 sentences in the user's own words
- **Core Value** — the one thing that must work above all else
- **Requirements → Active** — 5-15 checkbox items as hypotheses (not commitments)
- **Requirements → Out of Scope** — explicit boundaries with reasoning
- **Context** — technical environment, prior work, user insights
- **Constraints** — hard limits with rationale
- **Key Decisions** — choices from questioning, with rationale and "Pending" outcome

Commit if git tracking is active:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs: initialize project" --files .planning/PROJECT.md
```

## 5. Workflow Preferences

Ask 3 configuration questions via AskUserQuestion. Keep this brief — these can be
changed later in `.planning/config.json`.

**Question 1 — Model Profile:**

> **Which model profile should BWB use for sub-agents?**
>
> - **quality** — Opus for everything. Best results, highest cost.
> - **balanced** — Opus for planning, Sonnet for execution. Good tradeoff. *(default)*
> - **budget** — Sonnet/Haiku mix. Fastest and cheapest.

Default to `balanced` if user has no preference.

**Question 2 — Git Tracking:**

> **Should BWB commit planning documents to git?** (PROJECT.md, ROADMAP.md, plans, etc.)
>
> - **yes** — Track planning docs alongside code. Recommended for most projects. *(default)*
> - **no** — Keep planning docs untracked. Add `.planning/` to `.gitignore`.

Default to `yes` if user has no preference.

**Question 3 — Search Gitignored Files:**

> **Should BWB search gitignored files during research and analysis?**
> (e.g., node_modules, build output, vendor directories)
>
> - **yes** — Search everything. Useful if important code is in ignored directories.
> - **no** — Respect .gitignore. Faster, less noise. *(default)*

Default to `no` if user has no preference.

Initialize config and write values:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js config-ensure-section
node /Users/dustbit/.claude/bwb/bin/bwb.js config-set model_profile "{value}"
node /Users/dustbit/.claude/bwb/bin/bwb.js config-set commit_docs "{value}"
node /Users/dustbit/.claude/bwb/bin/bwb.js config-set search_gitignored "{value}"
```

If `commit_docs` is "no", add `.planning/` to `.gitignore`.

## 6. Research (2 Parallel Researchers)

Display the research banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► RESEARCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Resolve the researcher model:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-researcher
```

Spawn 2 `bwb-researcher` agents **in parallel** using the resolved model. Each researcher
receives the full PROJECT.md as context along with their specific research brief.

### Researcher A: Stack + Features

Research brief:
- What tech stack best fits this project's requirements and constraints?
- Evaluate framework/library options with tradeoffs (not just "use X")
- What key libraries or tools are needed for each major feature?
- Are there existing solutions to build on vs. building from scratch?
- What's the recommended project structure for this stack?

Output to: `.planning/research/stack-and-features.md`

### Researcher B: Architecture + Pitfalls

Research brief:
- What architecture pattern fits this project? (monolith, microservices, serverless, etc.)
- How should data flow through the system?
- What are the most common pitfalls for this type of project?
- What do teams usually get wrong on the first attempt?
- What performance, security, or scaling concerns should be addressed early?
- Are there design patterns particularly suited to the core requirements?

Output to: `.planning/research/architecture-and-pitfalls.md`

### Synthesize Findings

After both complete, synthesize inline (not a sub-agent). Present a consolidated summary:
1. **Recommended stack** — what and why
2. **Architecture approach** — how to structure it
3. **Key risks** — what to watch out for
4. **New decisions** — update PROJECT.md Key Decisions table with research-informed choices

Keep synthesis concise — detailed research lives in the files for phase planning reference.

Commit research files if git tracking is active:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs: add project research" --files .planning/research/stack-and-features.md .planning/research/architecture-and-pitfalls.md
```

## 7. Roadmap Creation

Display the roadmap banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Resolve the roadmapper model:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-roadmapper
```

Spawn a `bwb-roadmapper` agent with this context:
- `.planning/PROJECT.md` — requirements, constraints, key decisions
- `.planning/research/stack-and-features.md` — stack recommendations
- `.planning/research/architecture-and-pitfalls.md` — architecture + risk insights
- Template: `/Users/dustbit/.claude/bwb/templates/roadmap.md`
- State template: `/Users/dustbit/.claude/bwb/templates/state.md`

The roadmapper agent must:

1. **Create ROADMAP.md** (`.planning/ROADMAP.md`) using the roadmap template.
   - 3-8 coherent phases, each delivering something tangible and testable
   - 2-5 success criteria per phase (observable user behaviors)
   - No time estimates. Every Active requirement maps to at least one phase.
   - Research insights inform stack choices (Phase 1) and architecture (overall structure)

2. **Create STATE.md** (`.planning/STATE.md`) using the state template.
   - Phase: 1, Status: "Ready to research", Step: "research"
   - Reference PROJECT.md core value, progress at 0%, last activity: today

3. **Create phase directories:** `.planning/phases/{N}-{slug}/` for each phase.

### Present Roadmap for Approval

After the roadmapper completes, present the roadmap summary via AskUserQuestion:

> **Roadmap: {Project Name}** — {N} phases
>
> {For each phase:}
> **Phase {N}: {Name}** — {one-line description}
>   Success criteria: {numbered list}
>
> **Does this look right?** I can adjust phases, reorder, split, merge, or change scope.

If user wants changes: revise files, re-present, repeat until approved.

## 8. Commit & Route to Next Step

Once approved, commit all planning documents and update state:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs: project initialization complete" --files .planning/PROJECT.md .planning/ROADMAP.md .planning/STATE.md .planning/config.json .planning/research/stack-and-features.md .planning/research/architecture-and-pitfalls.md
node /Users/dustbit/.claude/bwb/bin/bwb.js state record-session --stopped-at "Project initialized. Ready to research Phase 1."
```

Display the completion banner and route to next step.

</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{Project Name}** — {N} phases planned

Files created:
- .planning/PROJECT.md
- .planning/ROADMAP.md
- .planning/STATE.md
- .planning/config.json
- .planning/research/stack-and-features.md
- .planning/research/architecture-and-pitfalls.md

───────────────────────────────────────────────────────

## ▶ Next Up

**Research Phase 1** — investigate tech/approach for {Phase 1 Name}

/bwb:research 1

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] .planning/ directory created
- [ ] Git initialized if needed
- [ ] Brownfield detection handled (redirected or user chose to continue)
- [ ] Deep questioning completed — motivation, scope, boundaries, constraints explored
- [ ] PROJECT.md created with requirements as hypotheses in Active section
- [ ] Key Decisions captured from questioning
- [ ] Config preferences captured (model_profile, commit_docs, search_gitignored)
- [ ] config.json written to .planning/
- [ ] Research completed — 2 parallel bwb-researcher agents (Stack+Features, Architecture+Pitfalls)
- [ ] Research findings synthesized and presented to user
- [ ] ROADMAP.md created with phases, success criteria, and requirement coverage
- [ ] STATE.md initialized at Phase 1, step: research, status: Ready to research
- [ ] Phase directories created under .planning/phases/
- [ ] User approved the roadmap (with revisions if needed)
- [ ] All files committed (if commit_docs enabled)
- [ ] User knows next step: /bwb:research 1
</success_criteria>
