<purpose>
Research how to implement a phase. Spawns bwb-researcher agent with phase context from
ROADMAP.md and PROJECT.md. Produces RESEARCH.md that informs the discussion step.

In BWB, research happens BEFORE discuss. The researcher gets the phase goal and project
context (not CONTEXT.md, which doesn't exist yet). Research findings are then used by
/bwb:discuss to ask informed questions.

Flow: Validate phase → Check existing research → Gather context → Spawn researcher → Present results → Route to /bwb:discuss.
</purpose>

<required_reading>
- `.planning/ROADMAP.md` — phase goal and success criteria
- `.planning/PROJECT.md` — project context, constraints, core value
</required_reading>

<process>

## 0. Initialize Context

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init phase-op "$ARGUMENTS")
```

Extract from init JSON: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `phase_found`, `commit_docs`, `has_research`, `has_context`.

Resolve researcher model:
```bash
RESEARCHER_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-researcher --raw)
```

## 1. Validate Phase

**If `phase_found` is false:**
```
Phase [X] not found in roadmap.

Use /bwb:progress to see available phases.
```
Exit workflow.

**If `phase_found` is true:** Get phase details:
```bash
PHASE_INFO=$(node /Users/dustbit/.claude/bwb/bin/bwb.js roadmap get-phase "${phase_number}")
```

Extract `phase_number`, `phase_name`, `goal`, `section` from JSON.

## 2. Check Existing Research

**If `has_research` is true:**

Use AskUserQuestion:
- header: "Existing research"
- question: "Phase ${phase_number} already has research. What do you want to do?"
- options:
  - "Update it" — Re-research with fresh data
  - "View it" — Show me what's there
  - "Skip" — Use existing research as-is

If "Update": Continue to step 3
If "View": Display RESEARCH.md, then offer update/skip
If "Skip": Route to `/bwb:discuss ${phase_number}` and exit

**If `has_research` is false:** Continue to step 3.

## 3. Gather Phase Context

Read the phase section from ROADMAP.md and project context:

```bash
cat .planning/PROJECT.md
```

Build the context package:
- Phase goal and success criteria (from PHASE_INFO)
- Project core value, constraints, tech preferences (from PROJECT.md)
- Platform info (from PROJECT.md `## Platform` section)
- Requirements mapped to this phase (from ROADMAP.md)

Present summary:
```
Researching Phase ${phase_number}: ${phase_name}
Goal: ${goal}

Context loaded from PROJECT.md and ROADMAP.md.
Spawning researcher agent...
```

## 4. Spawn bwb-researcher Agent

Create phase directory if needed:
```bash
mkdir -p "${phase_dir}"
```

Build the research prompt:

```markdown
<research_type>
Phase Research — investigating HOW to implement a specific phase well.
</research_type>

<key_insight>
The question is NOT "which library should I use?"

The question is: "What do I not know that I don't know?"

For this phase, discover:
- What's the established architecture pattern?
- What libraries form the standard stack?
- What problems do people commonly hit?
- What's SOTA vs what Claude's training thinks is SOTA?
- What should NOT be hand-rolled?
</key_insight>

<objective>
Research implementation approach for Phase ${phase_number}: ${phase_name}
</objective>

<context>
**Phase goal:** ${goal}
**Phase success criteria:** ${success_criteria}
**Project core value:** ${core_value}
**Project constraints:** ${constraints}
**Project platform:** ${platform}
**Requirements for this phase:** ${requirements}
</context>

<downstream_consumer>
Your RESEARCH.md will be loaded by /bwb:discuss which uses it to:
- Ask the user informed questions based on your findings
- "Research found library X has limitation Y — how should we handle this?"
- Surface tradeoffs the user should weigh in on

Then /bwb:contracts uses it to:
- Verify that behavioral contracts are technically feasible
- Add feasibility notes to FEAT entries
- Flag contracts that need specific implementation approaches

Be prescriptive, not exploratory. "Use X" not "Consider X or Y."
</downstream_consumer>

<output>
Write to: ${phase_dir}/${padded_phase}-RESEARCH.md
commit_docs: ${commit_docs}
</output>
```

Spawn:
```
Task(
  prompt="First, read /Users/dustbit/.claude/agents/bwb-researcher.md for your role and instructions.\n\n" + research_prompt,
  subagent_type="general-purpose",
  model="${RESEARCHER_MODEL}",
  description="Research Phase ${phase_number}"
)
```

## 5. Handle Agent Return

**`## RESEARCH COMPLETE`:**

Display the key findings summary. Then offer next steps:

Use AskUserQuestion:
- header: "Research done"
- question: "Research complete for Phase ${phase_number}. What next?"
- options:
  - "Continue to discussion (Recommended)" — Run /bwb:discuss ${phase_number}
  - "Dig deeper" — Spawn another research pass
  - "Review full research" — Show RESEARCH.md contents

If "Continue to discussion":
```
Research complete for Phase ${phase_number}: ${phase_name}.

## Next Up

/bwb:discuss ${phase_number}

/clear first → fresh context window
```

If "Dig deeper": Spawn continuation agent with existing research as context.

If "Review full": Display RESEARCH.md contents, then offer continue/dig deeper.

**`## RESEARCH BLOCKED`:**

Show what was attempted. Use AskUserQuestion for resolution:
- "Add context" — User provides more info, re-spawn
- "Try different approach" — Different research angle
- "Skip research" — Proceed without research (warn about impact on discussion quality)

## 6. Update State

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "research", "Status": "Research complete"}'
```

</process>

<success_criteria>
- [ ] Phase validated against roadmap
- [ ] Existing research checked (offer update/skip if exists)
- [ ] Phase context gathered from ROADMAP.md and PROJECT.md
- [ ] bwb-researcher spawned with full context
- [ ] RESEARCH.md written to phase directory
- [ ] Results presented to user
- [ ] User routed to /bwb:discuss
</success_criteria>
