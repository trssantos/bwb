# PROJECT.md Template

Template for `.planning/PROJECT.md` — the living project context document.

<template>

```markdown
# [Project Name]

## What This Is

[Current accurate description — 2-3 sentences. What does this product do and who is it for?
Use the user's language and framing. Update whenever reality drifts from this description.]

## Core Value

[The ONE thing that matters most. If everything else fails, this must work.
One sentence that drives prioritization when tradeoffs arise.]

## Platform

**Runtime:** [What executes the code — Node.js / Python / OpenClaw AI agent / browser extension / serverless / etc.]
**Execution model:** [How things run — scripts / AI skill files / cron jobs / event-driven / CLI / etc.]
**Capabilities:** [What the runtime CAN do — file I/O, HTTP, browser automation, database, etc.]
**Limitations:** [What the runtime CANNOT do — no npm packages, no long-running processes, etc.]

[If the platform is standard (Node.js app, Python script, React app), this can be brief.
If the platform is non-standard or unfamiliar (AI agent platforms, no-code tools, custom runtimes),
this section is CRITICAL — every downstream agent reads it to understand what's possible.]

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] [Requirement 1]
- [ ] [Requirement 2]
- [ ] [Requirement 3]

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- [Exclusion 1] — [why]
- [Exclusion 2] — [why]

## Context

[Background information that informs implementation:
- Technical environment or ecosystem
- Relevant prior work or experience
- User research or feedback themes
- Known issues to address]

## Constraints

- **[Type]**: [What] — [Why]
- **[Type]**: [What] — [Why]

Common types: Tech stack, Timeline, Budget, Dependencies, Compatibility, Performance, Security

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| [Choice] | [Why] | [Pending] |

---
*Last updated: [date] after [trigger]*
```

</template>

<guidelines>

**What This Is:**
- Current accurate description of the product
- 2-3 sentences capturing what it does and who it's for
- Use the user's words and framing
- Update when the product evolves beyond this description

**Core Value:**
- The single most important thing
- Everything else can fail; this cannot
- Drives prioritization when tradeoffs arise
- Rarely changes; if it does, it's a significant pivot

**Platform:**
- What actually runs the code — this gates ALL technical recommendations
- For well-known platforms: brief is fine
- For unfamiliar or niche platforms: be thorough — researchers, planners, and builders need to understand what's possible
- Researchers, planners, and builders all read this to understand what's possible
- If the user mentions an unfamiliar platform, research should investigate it deeply

**Requirements — Validated:**
- Requirements that shipped and proved valuable
- Format: `- ✓ [Requirement] — [phase]`
- These are locked — changing them requires explicit discussion

**Requirements — Active:**
- Current scope being built toward
- These are hypotheses until shipped and validated
- Move to Validated when shipped, Out of Scope if invalidated

**Requirements — Out of Scope:**
- Explicit boundaries on what we're not building
- Always include reasoning (prevents re-adding later)

**Context:**
- Background that informs implementation decisions
- Technical environment, prior work, user feedback
- Known issues or technical debt to address

**Constraints:**
- Hard limits on implementation choices
- Include the "why" — constraints without rationale get questioned

**Key Decisions:**
- Significant choices that affect future work
- Track outcome: Pending / Good / Revisit

</guidelines>

<evolution>

PROJECT.md evolves throughout the project lifecycle.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted
6. Platform understanding changed? → Update Platform section

</evolution>
