<purpose>
Extract implementation decisions that downstream agents need. Analyze the phase to identify
gray areas, let the user choose what to discuss, then deep-dive each selected area until satisfied.

You are a thinking partner, not an interviewer. The user is the visionary — you are the builder.
Your job is to capture decisions that will guide contract extraction and planning, not to figure
out implementation yourself.

**BWB difference from GSD:** Discussion receives RESEARCH.md as input. Research findings inform
the questions — "Research found library X has limitation Y — how should we handle this?"

Flow: Initialize → Load research → Analyze gray areas → Present choices → Discuss selected areas → Write CONTEXT.md → Route to /bwb:contracts.
</purpose>

<downstream_awareness>
**CONTEXT.md feeds into:**

1. **`/bwb:contracts`** — Reads CONTEXT.md to derive behavioral feature contracts (FEAT entries)
   - "User wants card-based layout" → FEAT: "Content displays in card format"
   - "Swipe to delete" → FEAT: "User can delete items by swiping"

2. **bwb-planner** — Reads CONTEXT.md to know WHAT decisions are locked
   - "Pull-to-refresh on mobile" → planner includes that in task specs
   - "Claude's Discretion: loading skeleton" → planner can decide approach

**Your job:** Capture decisions clearly enough that `/bwb:contracts` can derive testable behavioral specifications without asking the user again.

**Not your job:** Figure out HOW to implement. That's what research already investigated and planning will figure out with the decisions you capture.
</downstream_awareness>

<philosophy>
**User = founder/visionary. Claude = builder.**

The user knows:
- How they imagine it working
- What it should look/feel like
- What's essential vs nice-to-have
- Specific behaviors or references they have in mind

The user doesn't know (and shouldn't be asked):
- Codebase patterns (researcher reads the code)
- Technical risks (researcher identified these)
- Implementation approach (planner figures this out)
- Success metrics (inferred from the work)

Ask about vision and implementation choices. Capture decisions for downstream contracts.
</philosophy>

<scope_guardrail>
**CRITICAL: No scope creep.**

The phase boundary comes from ROADMAP.md and is FIXED. Discussion clarifies HOW to implement what's scoped, never WHETHER to add new capabilities.

**Allowed (clarifying ambiguity):**
- "How should posts be displayed?" (layout, density, info shown)
- "What happens on empty state?" (within the feature)
- "Pull to refresh or manual?" (behavior choice)

**Not allowed (scope creep):**
- "Should we also add comments?" (new capability)
- "What about search/filtering?" (new capability)
- "Maybe include bookmarking?" (new capability)

**When user suggests scope creep:**
```
"[Feature X] would be a new capability — that's its own phase.
Want me to note it for the roadmap backlog?

For now, let's focus on [phase domain]."
```

Capture the idea in a "Deferred Ideas" section. Don't lose it, don't act on it.
</scope_guardrail>

<gray_area_identification>
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result.

**How to identify gray areas:**

1. **Read the phase goal** from ROADMAP.md
2. **Read RESEARCH.md** for findings that surface tradeoffs
3. **Understand the domain** — What kind of thing is being built?
   - Something users SEE → visual presentation, interactions, states matter
   - Something users CALL → interface contracts, responses, errors matter
   - Something users RUN → invocation, output, behavior modes matter
   - Something users READ → structure, tone, depth, flow matter
   - Something being ORGANIZED → criteria, grouping, handling exceptions matter
4. **Generate phase-specific gray areas** informed by research findings

**Research-informed gray areas:**
- "Research found X has a performance limitation above 1000 items — how should we handle large lists?"
- "Standard approach is library Y, but it doesn't support Z which your requirements mention"
- "Two common patterns exist for this: A (simpler, less flexible) or B (more complex, future-proof)"

**Claude handles these (don't ask):**
- Technical implementation details
- Architecture patterns (research already investigated)
- Performance optimization approaches
- Scope (roadmap defines this)
</gray_area_identification>

<process>

<step name="initialize" priority="first">
Phase number from argument (required).

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init phase-op "${PHASE}")
```

Parse JSON for: `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_contracts`.

**If `phase_found` is false:**
```
Phase [X] not found in roadmap.

Use /bwb:progress to see available phases.
```
Exit workflow.

**If `phase_found` is true:** Continue to check_existing.
</step>

<step name="check_existing">
Check if CONTEXT.md already exists using `has_context` from init.

**If exists:**
Use AskUserQuestion:
- header: "Existing context"
- question: "Phase ${phase_number} already has context. What do you want to do?"
- options:
  - "Update it" — Review and revise existing context
  - "View it" — Show me what's there
  - "Skip" — Use existing context as-is

If "Update": Load existing, continue to load_research
If "View": Display CONTEXT.md, then offer update/skip
If "Skip": Route to `/bwb:contracts ${phase_number}` and exit

**If doesn't exist:** Continue to load_research.
</step>

<step name="load_research">
Load RESEARCH.md if it exists (it should — research runs before discuss in BWB).

```bash
cat "${phase_dir}/${padded_phase}-RESEARCH.md" 2>/dev/null
```

**If RESEARCH.md exists:** Parse for key findings, standard stack, pitfalls, patterns. These inform your gray area analysis and questions.

**If RESEARCH.md doesn't exist:** Warn the user:
```
No research found for this phase. Research typically runs before discussion in BWB.

Consider running /bwb:research ${phase_number} first for better-informed discussion.
```

Use AskUserQuestion:
- header: "No research"
- question: "Continue discussion without research, or research first?"
- options:
  - "Continue anyway" — Discuss without research context
  - "Research first" — Run /bwb:research first

If "Research first": Route to `/bwb:research ${phase_number}` and exit.

Continue to analyze_phase.
</step>

<step name="analyze_phase">
Analyze the phase to identify gray areas worth discussing.

**Read the phase description from ROADMAP.md:**
```bash
PHASE_INFO=$(node /Users/dustbit/.claude/bwb/bin/bwb.js roadmap get-phase "${phase_number}")
```

**Determine:**

1. **Domain boundary** — What capability is this phase delivering? State it clearly.

2. **Research-informed gray areas** — Use RESEARCH.md findings to identify specific decisions:
   - Tradeoffs surfaced by research
   - Areas where research found multiple valid approaches
   - Pitfalls that require user input on handling strategy
   - Stack choices that affect user-visible behavior

3. **Domain gray areas** — Phase-specific ambiguities independent of research

4. **Skip assessment** — If no meaningful gray areas exist (pure infrastructure, clear-cut implementation), the phase may not need discussion.
</step>

<step name="present_gray_areas">
Present the domain boundary and gray areas to user.

**First, state the boundary:**
```
Phase ${phase_number}: ${phase_name}
Domain: [What this phase delivers — from your analysis]

We'll clarify HOW to implement this.
(New capabilities belong in other phases.)
```

**If research was loaded, highlight key findings:**
```
Research highlights:
- [Key finding 1 that affects decisions]
- [Key finding 2 that affects decisions]
```

**Then use AskUserQuestion (multiSelect: true):**
- header: "Discuss"
- question: "Which areas do you want to discuss for ${phase_name}?"
- options: Generate 3-4 phase-specific gray areas, each formatted as:
  - "[Specific area]" (label) — concrete, not generic
  - [1-2 questions this covers + research insight] (description)

**Do NOT include a "skip" or "you decide" option.** User ran this command to discuss — give them real choices.

Continue to discuss_areas with selected areas.
</step>

<step name="discuss_areas">
For each selected area, conduct a focused discussion loop.

**Philosophy: 4 questions, then check.**

Ask 4 questions per area before offering to continue or move on. Each answer often reveals the next question.

**For each area:**

1. **Announce the area:**
   ```
   Let's talk about [Area].
   ```
   If research had relevant findings, mention them:
   ```
   Research note: [relevant finding that informs this discussion]
   ```

2. **Ask 4 questions using AskUserQuestion:**
   - header: "[Area]"
   - question: Specific decision for this area
   - options: 2-3 concrete choices (AskUserQuestion adds "Other" automatically)
   - Include "You decide" as an option when reasonable — captures Claude discretion

3. **After 4 questions, check:**
   - header: "[Area]"
   - question: "More questions about [area], or move to next?"
   - options: "More questions" / "Next area"

   If "More questions" → ask 4 more, then check again
   If "Next area" → proceed to next selected area

4. **After all areas complete:**
   - header: "Done"
   - question: "That covers [list areas]. Ready to create context?"
   - options: "Create context" / "Revisit an area"

**Question design:**
- Options should be concrete, not abstract ("Cards" not "Option A")
- Each answer should inform the next question
- If user picks "Other", receive their input, reflect it back, confirm
- Reference research findings when relevant to the question

**Scope creep handling:**
If user mentions something outside the phase domain:
```
"[Feature] sounds like a new capability — that belongs in its own phase.
I'll note it as a deferred idea.

Back to [current area]: [return to current question]"
```

Track deferred ideas internally.
</step>

<step name="write_context">
Create CONTEXT.md capturing decisions made.

**File location:** `${phase_dir}/${padded_phase}-CONTEXT.md`

**Structure the content by what was discussed:**

```markdown
# Phase [X]: [Name] - Context

**Gathered:** [date]
**Status:** Ready for contract extraction

<domain>
## Phase Boundary

[Clear statement of what this phase delivers — the scope anchor]

</domain>

<decisions>
## Implementation Decisions

### [Category 1 that was discussed]
- [Decision or preference captured]
- [Another decision if applicable]

### [Category 2 that was discussed]
- [Decision or preference captured]

### Claude's Discretion
[Areas where user said "you decide" — note that Claude has flexibility here]

</decisions>

<research_notes>
## Research Context

[Key research findings that informed discussion. These help /bwb:contracts understand
WHY certain decisions were made and what technical constraints exist.]

- [Research finding relevant to decisions above]
- [Another finding]

</research_notes>

<specifics>
## Specific Ideas

[Any particular references, examples, or "I want it like X" moments from discussion]

[If none: "No specific requirements — open to standard approaches"]

</specifics>

<deferred>
## Deferred Ideas

[Ideas that came up but belong in other phases. Don't lose them.]

[If none: "None — discussion stayed within phase scope"]

</deferred>

---

*Phase: XX-name*
*Context gathered: [date]*
```

Write file.
</step>

<step name="git_commit">
Commit phase context:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): capture phase context" --files "${phase_dir}/${padded_phase}-CONTEXT.md"
```
</step>

<step name="confirm_and_route">
Present summary and route to contracts:

```
Created: ${phase_dir}/${padded_phase}-CONTEXT.md

## Decisions Captured

### [Category]
- [Key decision]

### [Category]
- [Key decision]

[If deferred ideas exist:]
## Noted for Later
- [Deferred idea] — future phase

---

## Next Up

Phase ${phase_number}: ${phase_name} — Extract behavioral contracts

/bwb:contracts ${phase_number}

/clear first → fresh context window

---

**Also available:**
- Review/edit CONTEXT.md before continuing
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "discuss", "Status": "Context captured"}'
```
</step>

</process>

<success_criteria>
- [ ] Phase validated against roadmap
- [ ] RESEARCH.md loaded and used to inform questions
- [ ] Gray areas identified through intelligent analysis (not generic questions)
- [ ] User selected which areas to discuss
- [ ] Each selected area explored until user satisfied
- [ ] Scope creep redirected to deferred ideas
- [ ] CONTEXT.md captures actual decisions, not vague vision
- [ ] Deferred ideas preserved for future phases
- [ ] Research context preserved for contract extraction
- [ ] User routed to /bwb:contracts
</success_criteria>
