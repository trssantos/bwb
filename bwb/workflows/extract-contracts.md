<purpose>
BWB's signature workflow. Transforms discussion decisions and research findings into
behavioral feature contracts (FEAT entries). Each FEAT has acceptance criteria that
become the validation target during /bwb:validate.

Contracts are behavioral and technology-agnostic:
- Good: "User can save a draft and resume editing later"
- Bad: "AsyncStorage.setItem called with draft key"

This is where the rubber meets the road. Every decision from /bwb:discuss becomes a
testable behavioral specification. Every ROADMAP success criterion gets a matching FEAT.
The contract set is complete when: every decision is covered, every success criterion
maps to a FEAT, and there are no orphans in either direction.

Flow: Load context → Derive FEATs from decisions → Derive FEATs from success criteria →
Cross-reference research → Establish dependencies → Reconcile → User review → Write CONTRACTS.md → Route to /bwb:plan.
</purpose>

<required_reading>
- `.planning/phases/XX-name/XX-CONTEXT.md` — locked decisions from discussion
- `.planning/phases/XX-name/XX-RESEARCH.md` — technical findings and feasibility
- `.planning/ROADMAP.md` — phase goal and success criteria
- `/Users/dustbit/.claude/bwb/templates/contracts.md` — output format template
</required_reading>

<contract_philosophy>
## What Makes a Good Contract

A contract (FEAT entry) is a behavioral specification that:
1. **Describes what the user can do or observe** — not implementation details
2. **Has acceptance criteria that are verifiable** — can be checked by reading code
3. **Is technology-agnostic** — doesn't prescribe HOW, only WHAT
4. **Maps to user value** — connects to project core value or phase goal

### Good Contracts
```
FEAT-01: Draft Saving
What: User can save incomplete work and return to it later
Expected: Drafts persist across sessions and restore to exact state
Acceptance:
  - Saving a draft preserves all form fields
  - Closing and reopening the app shows the draft
  - Editing a draft updates the existing draft
  - User can discard a draft explicitly
```

### Bad Contracts
```
FEAT-01: Save State
What: Implement AsyncStorage persistence layer
Expected: State serialized to JSON and stored
Acceptance:
  - AsyncStorage.setItem called
  - JSON.parse on retrieval
  - Error caught on serialization failure
```

The bad contract describes implementation, not behavior. It could pass while the feature is completely broken from the user's perspective.

## Contract Granularity

**Too coarse:** "User can use the app" — can't validate meaningfully
**Too fine:** "Button has 8px padding" — CSS detail, not behavior
**Just right:** "User can filter posts by category" — testable, behavioral, meaningful

Rule of thumb: Each FEAT should be one coherent behavior that a user would describe as "one thing I can do."
</contract_philosophy>

<process>

## Step 0: Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init phase-op "${PHASE}")
```

Parse JSON for: `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `commit_docs`, `has_context`, `has_research`, `has_contracts`.

**If `has_context` is false:**
```
No context found for Phase ${phase_number}. Discussion captures decisions needed for contracts.

Run /bwb:discuss ${phase_number} first.
```
Exit workflow.

**If `has_contracts` is true:**
Use AskUserQuestion:
- header: "Existing contracts"
- question: "Phase ${phase_number} already has contracts. What do you want to do?"
- options:
  - "Update" — Revise existing contracts
  - "View" — Show current contracts
  - "Skip" — Use existing contracts for planning

If "Skip": Route to `/bwb:plan ${phase_number}` and exit.

## Step 1: Load All Inputs

Read three sources:

```bash
# Context from discussion
cat "${phase_dir}/${padded_phase}-CONTEXT.md"

# Research findings
cat "${phase_dir}/${padded_phase}-RESEARCH.md" 2>/dev/null

# Phase info from roadmap
PHASE_INFO=$(node /Users/dustbit/.claude/bwb/bin/bwb.js roadmap get-phase "${phase_number}")
```

Also read the contracts template for format reference:
```bash
cat /Users/dustbit/.claude/bwb/templates/contracts.md
```

Extract:
- **From CONTEXT.md:** All locked decisions, Claude's Discretion areas, specific ideas, deferred ideas
- **From RESEARCH.md:** Standard stack, pitfalls, feasibility constraints
- **From ROADMAP.md:** Phase goal, success criteria, requirements mapped to this phase

## Step 2: Derive FEATs from Decisions

For each locked decision in CONTEXT.md, ask: "What behavior does this decision imply?"

**Process:**
1. Read each decision
2. Identify the user-observable behavior it describes
3. Draft a FEAT entry with:
   - **What:** The capability (behavioral)
   - **Expected:** The observable outcome
   - **Acceptance:** 2-5 verifiable criteria
   - **Source:** Reference to the CONTEXT.md decision

**Example:**
```
Decision: "Card-based layout for posts"
→ FEAT-01: Card Layout
  What: Posts display in a card-based layout
  Expected: Each post appears as a distinct visual card with clear boundaries
  Acceptance:
    - Posts render as individual cards (not a flat list)
    - Cards have visible boundaries/separation
    - Card content follows decided information density
  Source: Discussion — Layout style
```

**Claude's Discretion items:** Don't create FEATs for these unless they represent user-observable behavior. Note them as implementation flexibility in the FEAT they relate to.

## Step 3: Derive FEATs from Success Criteria

For each ROADMAP success criterion, check:
- Is it already covered by a decision-derived FEAT? → Merge/annotate
- Is it NOT covered? → Create a new FEAT

Success criteria are already close to behavioral specs. Translate them into FEAT format.

**Example:**
```
Success criterion: "Users can browse content in a scrollable feed"
→ Already covered by FEAT-01 (card layout) + FEAT-02 (infinite scroll)? → Annotate both
→ Not covered? → Create FEAT-03: Scrollable Feed
```

## Step 4: Cross-Reference Research

For each FEAT, check RESEARCH.md for:
- **Feasibility:** Is this technically achievable with the standard stack?
- **Pitfall risk:** Does this feature have known pitfalls?
- **Complexity flag:** Is this more complex than it appears?

Add notes to FEAT entries where relevant:
```
FEAT-03: Real-time Updates
...
Notes: Research flagged WebSocket connection management as a common pitfall.
       Standard stack includes socket.io for this.
```

## Step 5: Establish Dependencies

Some FEATs depend on others:
```
FEAT-04: Share Post → Depends: FEAT-01 (posts must exist to share)
FEAT-05: Edit Draft → Depends: FEAT-03 (drafts must exist to edit)
```

Dependencies are used by:
- **bwb-planner:** Orders tasks so dependent FEATs are built after their prerequisites
- **bwb-validator:** Checks L5 INTEGRATED level — verifies integration between dependent FEATs

## Step 6: Reconciliation

**Coverage check — three-way:**

1. **Decision → FEAT:** Every locked decision contributes to at least one FEAT
   - Gap: Decision discussed but not contracted → needs a FEAT or is purely technical (note why)

2. **Success Criterion → FEAT:** Every success criterion maps to at least one FEAT
   - Gap: Criterion with no FEAT → add FEAT or explain why it's covered implicitly

3. **FEAT → Decision/Criterion:** Every FEAT traces to a decision or criterion
   - Gap: FEAT with no source → question whether it belongs here (implied? over-engineering?)

**Present reconciliation:**
```
Coverage Check:
- Decisions: X/X covered by FEATs
- Success Criteria: X/X mapped to FEATs
- FEATs: X total, X from decisions, X from criteria, X merged
- Gaps: [list any, or "None — full coverage"]
```

## Step 7: User Review

Present the complete contract set for approval.

**For each FEAT, show:**
```
FEAT-{NN}: {Title}
What: {behavioral description}
Expected: {observable outcome}
Acceptance:
  - {criterion 1}
  - {criterion 2}
Source: {decision/criterion reference}
Depends: {FEAT dependencies, if any}
```

**Then ask:**
Use AskUserQuestion:
- header: "Contracts"
- question: "Review these ${feat_count} contracts for Phase ${phase_number}. Any changes?"
- options:
  - "Looks good" — Approve and write
  - "Modify" — I want to change some
  - "Add more" — Missing a behavior
  - "Remove some" — Too granular

**If "Modify":** Ask which FEAT to modify, get changes, update.
**If "Add more":** Ask what behavior is missing, create new FEAT, re-reconcile.
**If "Remove some":** Ask which, verify coverage isn't broken, remove.

Iterate until user approves.

## Step 8: Write CONTRACTS.md

Write to: `${phase_dir}/${padded_phase}-CONTRACTS.md`

Follow the template format from `/Users/dustbit/.claude/bwb/templates/contracts.md`.

**Structure:**
```markdown
# Phase [X]: [Name] - Contracts

**Extracted:** [date]
**Source:** CONTEXT.md decisions + ROADMAP.md success criteria
**Coverage:** [X] decisions → [Y] FEATs, [Z] success criteria mapped

## Contract Summary

| ID | Title | Source | Depends |
|----|-------|--------|---------|
| FEAT-01 | [title] | [decision/criterion] | — |
| FEAT-02 | [title] | [decision/criterion] | FEAT-01 |

## Contracts

### FEAT-01: [Title]

**What:** [behavioral description]
**Expected:** [observable outcome]

**Acceptance Criteria:**
1. [Verifiable criterion]
2. [Verifiable criterion]
3. [Verifiable criterion]

**Source:** [CONTEXT.md decision or ROADMAP criterion]
**Depends:** [FEAT-NN or "None"]
**Notes:** [Research feasibility notes, if any]

### FEAT-02: [Title]
...

## Coverage Matrix

| Source | Maps To | Status |
|--------|---------|--------|
| Decision: [X] | FEAT-01 | Covered |
| Criterion: [Y] | FEAT-01, FEAT-02 | Covered |
| ... | ... | ... |

## Implementation Notes

[Any cross-cutting concerns, shared patterns, or notes from research
that apply to multiple FEATs. These help the planner but are NOT contracts.]

---

*Phase: XX-name*
*Contracts extracted: [date]*
```

## Step 9: Commit

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): extract behavioral contracts" --files "${phase_dir}/${padded_phase}-CONTRACTS.md"
```

## Step 10: Route to Planning

```
Created: ${phase_dir}/${padded_phase}-CONTRACTS.md

## Contracts Extracted

${feat_count} behavioral contracts for Phase ${phase_number}: ${phase_name}

| ID | Title | Acceptance Criteria |
|----|-------|---------------------|
| FEAT-01 | [title] | [count] criteria |
| FEAT-02 | [title] | [count] criteria |

Coverage: ${decisions_covered}/${total_decisions} decisions, ${criteria_covered}/${total_criteria} success criteria

---

## Next Up

Phase ${phase_number}: ${phase_name} — Create implementation plans mapped to contracts

/bwb:plan ${phase_number}

/clear first → fresh context window
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "contracts", "Status": "Contracts extracted"}'
```

</process>

<success_criteria>
- [ ] CONTEXT.md loaded and all decisions processed
- [ ] RESEARCH.md loaded for feasibility cross-reference
- [ ] ROADMAP.md success criteria loaded
- [ ] FEATs derived from decisions (behavioral, not technical)
- [ ] FEATs derived from success criteria
- [ ] Research cross-referenced for feasibility notes
- [ ] FEAT dependencies established
- [ ] Three-way reconciliation completed (decisions, criteria, FEATs)
- [ ] User reviewed and approved contracts
- [ ] CONTRACTS.md written following template format
- [ ] Committed to git
- [ ] User routed to /bwb:plan

Quality indicators:
- **Behavioral, not technical:** FEATs describe what users can do, not how code works
- **Verifiable:** Acceptance criteria can be checked by reading code and tracing paths
- **Complete coverage:** Every decision and criterion maps to at least one FEAT
- **Right granularity:** Each FEAT is one coherent behavior
- **Contract-ready for validation:** bwb-validator can check each acceptance criterion at L1-L6
</success_criteria>
