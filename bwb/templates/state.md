# State Template

Template for `.planning/STATE.md` — the project's living memory.

<template>

```markdown
# Project State

## Project Reference

See: .planning/PROJECT.md (updated [date])

**Core value:** [One-liner from PROJECT.md Core Value section]
**Current focus:** [Current phase name]

## Current Position

**Current Phase:** [X]
**Current Phase Name:** [Name]
**Total Phases:** [Y]
**Current Plan:** [A]
**Total Plans in Phase:** [B]
**Status:** [Ready to research | Researching | Ready to discuss | Discussing | Ready for contracts | Extracting contracts | Ready to plan | Planning | Ready to build | Building | Ready to validate | Validating | Fixing gaps | Phase complete]
**Step:** [research | discuss | contracts | plan | build | validate | fix | complete]
**Last Activity:** [YYYY-MM-DD]
**Progress:** [░░░░░░░░░░] 0%

## Decisions

Recent decisions affecting current work:

- [Phase X]: [Decision summary]

## Blockers

None

## Session

**Last session:** [YYYY-MM-DD HH:MM]
**Stopped at:** [Description of last completed action]
```

</template>

<guidelines>

**Keep under 60 lines.** STATE.md is a digest, not an archive.

**Step field:** BWB's expanded step set:
- `research` — researching phase approach
- `discuss` — gathering decisions via discussion
- `contracts` — extracting behavioral contracts
- `plan` — creating implementation plans
- `build` — executing plans
- `validate` — checking features against contracts
- `fix` — fixing validation gaps
- `complete` — phase done

**Reading:** First step of every workflow for instant context.

**Writing:** After every significant action — position, status, step updates.

</guidelines>
