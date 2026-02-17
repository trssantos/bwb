<purpose>
Interactive configuration of BWB workflow settings — model profile, fix loop iterations, and auto-retry behavior. Updates .planning/config.json with user preferences.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="ensure_and_load_config">
Ensure config exists and load current state:

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js config-ensure-section
```

Creates `.planning/config.json` with defaults if missing.
</step>

<step name="read_current">
Read `.planning/config.json`.

Parse current values (use these defaults if not present):
- `model_profile` — which model each agent uses (default: `"balanced"`)
- `fix_max_iterations` — max fix loop iterations (default: `5`)
- `fix_auto_retry` — auto-retry without asking (default: `true`)
- `commit_docs` — commit documentation files (default: `true`)
</step>

<step name="present_settings">
Use AskUserQuestion with 3 questions:

```
AskUserQuestion([
  {
    question: "Which model profile for agents?",
    header: "Model",
    multiSelect: false,
    options: [
      { label: "Quality", description: "Opus for all agents (highest cost)" },
      { label: "Balanced (Recommended)", description: "Opus for planning, Sonnet for execution" },
      { label: "Budget", description: "Sonnet for writing, Haiku for research (lowest cost)" }
    ]
  },
  {
    question: "Max fix loop iterations before stopping?",
    header: "Fix retries",
    multiSelect: false,
    options: [
      { label: "3", description: "3 iterations (faster, less thorough)" },
      { label: "5 (Recommended)", description: "5 iterations (good balance)" },
      { label: "10", description: "10 iterations (very thorough, higher cost)" }
    ]
  },
  {
    question: "Auto-retry fix loop without asking?",
    header: "Auto-retry",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Loop automatically until clean or max iterations" },
      { label: "No", description: "Ask before each retry iteration" }
    ]
  }
])
```
</step>

<step name="update_config">
Map answers to config values:

**Model profile:**
- "Quality" → `"quality"`
- "Balanced (Recommended)" → `"balanced"`
- "Budget" → `"budget"`

**Fix retries:**
- "3" → `3`
- "5 (Recommended)" → `5`
- "10" → `10`

**Auto-retry:**
- "Yes (Recommended)" → `true`
- "No" → `false`

Merge new settings into existing config.json (preserve any fields not covered by settings):

```json
{
  ...existing_config,
  "model_profile": "quality" | "balanced" | "budget",
  "fix_max_iterations": 3 | 5 | 10,
  "fix_auto_retry": true | false
}
```

Write updated config to `.planning/config.json`.
</step>

<step name="confirm">
Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting              | Value |
|----------------------|-------|
| Model Profile        | ${model_profile} |
| Fix Max Iterations   | ${fix_max_iterations} |
| Fix Auto-Retry       | ${fix_auto_retry ? "On" : "Off"} |

These settings apply to future /bwb:fix runs.

Quick commands:
- /bwb:fix {phase} — fix validation gaps with these settings
- /bwb:validate {phase} — validate a phase
- /bwb:settings — change settings again
```
</step>

</process>

<success_criteria>
- [ ] Current config read (or defaults used)
- [ ] User presented with 3 settings (model profile, fix iterations, auto-retry)
- [ ] Config updated with all selected values
- [ ] Existing config fields preserved
- [ ] Changes confirmed to user with table
</success_criteria>
