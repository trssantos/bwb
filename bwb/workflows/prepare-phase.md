<purpose>
BWB's environment preparation orchestrator. Scans built code for external dependencies, auto-sets up what it can, asks the user about each external service (configure real / mock / skip / explain), and generates test fixtures so validation can verify logic without real credentials.

Flow: Initialize → Check existing → Load context → Scan (sub-agent) → User choices (interactive) → Execute choices (sub-agent) → Verify → Commit → Route to /bwb:validate.
</purpose>

<required_reading>
- `.planning/phases/XX-name/XX-CONTRACTS.md` — what features exist
- `.planning/phases/XX-name/XX-*-SUMMARY.md` — what was built
</required_reading>

<process>

## 1. Initialize

```bash
INIT=$(node /Users/dustbit/.claude/bwb/bin/bwb.js init prepare "$ARGUMENTS")
```

Parse JSON for: `preparer_model`, `commit_docs`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `padded_phase`, `has_contracts`, `has_summaries`, `has_preparation`, `detected_types`, `has_env`, `has_env_example`, `has_test_dir`.

**If `phase_found` is false:** Error — phase directory not found.
**If `has_contracts` is false:** Error — no contracts found. Run `/bwb:contracts ${phase}` first.
**If `has_summaries` is false:** Error — no build summaries found. Run `/bwb:build ${phase}` first.

Resolve preparer model:
```bash
PREPARER_MODEL=$(node /Users/dustbit/.claude/bwb/bin/bwb.js resolve-model bwb-preparer --raw)
```

## 2. Check Existing Preparation

**If `has_preparation` is true:**

Use AskUserQuestion:
- header: "Existing prep"
- question: "Phase ${phase_number} already has preparation results. What do you want to do?"
- options:
  - "Re-prepare" — Run fresh preparation
  - "View results" — Show existing PREPARATION.md
  - "Skip" — Keep existing results and route to validate

If "View results": Read and display the existing PREPARATION.md, then ask if they want to re-prepare or continue to validate.
If "Skip": Route directly to `/bwb:validate ${phase_number}`.

## 3. Load Context

```bash
# What features exist
CONTRACTS=$(cat "${phase_dir}/${padded_phase}-CONTRACTS.md" 2>/dev/null)

# What was built
SUMMARIES=""
for summary in ${phase_dir}/${padded_phase}-*-SUMMARY.md; do
  SUMMARIES="${SUMMARIES}\n$(cat "$summary")"
done
```

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PREPARING PHASE ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detected project type: ${detected_types}
Existing .env: ${has_env}
Test directory: ${has_test_dir}
```

## 4. Scan & Auto-Setup (Sub-agent)

Spawn a scanner agent to discover dependencies and run auto-setup. This agent does NOT interact with the user.

Scanner prompt:

```markdown
<task>
You are scanning a project for external dependencies and running auto-setup.

First, read /Users/dustbit/.claude/agents/bwb-preparer.md for scanning and auto-setup instructions (sections: dependency_discovery, credential_guidance, auto_setup).

Then scan the project and return a structured report. Do NOT ask the user anything — just scan and report.

**Phase:** ${phase_number} - ${phase_name}
**Project types detected:** ${detected_types}
**Has .env:** ${has_env}
**Has .env.example:** ${has_env_example}
**Has test directory:** ${has_test_dir}

**CONTRACTS (what features exist):**
${contracts_content}

**BUILD SUMMARIES (what was built):**
${summaries_content}
</task>

<output_format>
Return your findings in this exact format:

## Auto-Setup Actions
| Action | Details | Status |
|--------|---------|--------|
| [action] | [details] | Done/Skipped |

## External Dependencies
For each external service that needs credentials:

### [Service Name]
- **Env vars needed:** VAR_1, VAR_2
- **Used by:** FEAT-NN, FEAT-NN
- **Credential guidance:** [where to get these credentials, based on your knowledge of the service]
- **Verification approach:** [how to verify if possible, or "None — skip verification"]

## Local/Auto Dependencies
| Dependency | Status | Used By |
|------------|--------|---------|
| [dep] | [Auto-configured/Installed] | [FEAT-NN list] |

## Environment Variables
| Variable | Purpose | Category | Used By |
|----------|---------|----------|---------|
| [VAR] | [purpose] | [auto/external/local] | [FEAT-NN list] |
</output_format>
```

```
Task(
  prompt=scanner_prompt,
  subagent_type="general-purpose",
  model="${PREPARER_MODEL}",
  description="Scan Phase ${phase_number} deps"
)
```

Parse the scanner's response to extract:
- List of auto-setup actions completed
- List of external dependencies (each with: service name, env vars, FEATs, guidance)
- List of all environment variables with categories

## 5. User Choices (Interactive)

**If no external dependencies found:** Skip to Step 6.

For EACH external dependency from the scan results, use AskUserQuestion:

```
AskUserQuestion(
  header: "{Service Name}",
  question: "{Service} requires {credential list}. How do you want to handle it for validation?",
  options: [
    {
      label: "Mock it (Recommended)",
      description: "Generate realistic test fixtures — validation checks your logic without real {service}"
    },
    {
      label: "Configure real",
      description: "I'll paste my credentials — validation tests against live service"
    },
    {
      label: "Skip for now",
      description: "Leave unconfigured — affected FEATs will be marked as pending in validation"
    },
    {
      label: "Let me explain",
      description: "I have my own arrangement — I'll tell you about it"
    }
  ]
)
```

### If "Configure real"

Walk the user through credential entry step-by-step:

1. **Announce the group:** "{Service} needs N credential(s): `VAR_1`, `VAR_2`. Let's go through each."

2. **Per credential, AskUserQuestion:**
   ```
   AskUserQuestion(
     header: "{VAR_NAME}",
     question: "Paste your {VAR_NAME} for {Service}. {guidance from scanner}",
     options: [
       {
         label: "I don't have this yet",
         description: "Show me how to get it"
       },
       {
         label: "Switch to mock",
         description: "Mock this service instead of using real credentials"
       }
     ]
   )
   ```
   - User pastes the value via the "Other" text input
   - If "I don't have this yet": display the credential guidance from the scanner, then re-ask
   - If "Switch to mock": abort credential collection for this service, treat as "Mock it"

3. **Write to .env:** After receiving each credential value, immediately append/update in `.env`:
   ```
   # {Service} (configured by bwb:prepare)
   VAR_NAME=user_provided_value
   ```
   Confirm to the user: "Written `{VAR_NAME}` to `.env`"

4. **Verify if possible:** If the scanner suggested a verification approach, try it.
   - If verification succeeds → record as `Configured (verified)`
   - If verification fails → AskUserQuestion:
     ```
     AskUserQuestion(
       header: "Verify {Service}",
       question: "Verification for {Service} failed: {error}. What do you want to do?",
       options: [
         {
           label: "Re-enter credentials",
           description: "Try again with different values"
         },
         {
           label: "Continue anyway",
           description: "Keep these credentials — marked as unverified"
         },
         {
           label: "Switch to mock",
           description: "Mock this service instead"
         }
       ]
     )
     ```
   - If no verification approach available → record as `Configured (unverified)`

### If "Let me explain"

```
AskUserQuestion(
  header: "{Service}",
  question: "Tell me about your arrangement for {Service}.",
  options: [
    {
      label: "It's already configured",
      description: "Credentials are set up outside this project (system env, secrets manager, etc.)"
    },
    {
      label: "I'll handle it later",
      description: "I have a plan but haven't set it up yet"
    }
  ]
)
```
Record the user's response (predefined option or free-text via "Other") verbatim.

### Collect All Decisions

After all external dependencies are handled, compile a decisions summary:
```
decisions = {
  configured: [{service, vars, verified}],
  mocked: [{service, vars, feats}],
  explained: [{service, context, feats}],
  skipped: [{service, feats}]
}
```

## 6. Execute Choices & Write PREPARATION.md (Sub-agent)

Spawn an executor agent with the scan results and user decisions.

Executor prompt:

```markdown
<task>
You are executing preparation choices and writing the PREPARATION.md report.

First, read /Users/dustbit/.claude/agents/bwb-preparer.md for mock generation instructions and output format (sections: mock_generation, output_format).

**Phase:** ${phase_number} - ${phase_name}

**Scan results:**
${scan_results}

**User decisions:**
${decisions_summary}

**CONTRACTS:**
${contracts_content}
</task>

<instructions>
1. For each "mocked" service: generate mock fixtures and client stubs per the mock_generation instructions
2. Compile everything into PREPARATION.md using the output_format and template

Write to: ${phase_dir}/${padded_phase}-PREPARATION.md
Template: /Users/dustbit/.claude/bwb/templates/preparation.md
</instructions>
```

```
Task(
  prompt=executor_prompt,
  subagent_type="general-purpose",
  model="${PREPARER_MODEL}",
  description="Execute prep Phase ${phase_number}"
)
```

## 7. Verify Results

After executor returns:

1. Check PREPARATION.md exists at `${phase_dir}/${padded_phase}-PREPARATION.md`
2. If mocks were generated, verify mock directory exists
3. Read PREPARATION.md frontmatter for status

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BWB ► PREPARATION COMPLETE — Phase ${phase_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ${status}
Auto-setup actions: ${auto_setup_count}
External deps: ${external_deps_count}
  Configured: ${configured_count}
  Mocked: ${mocked_count}
  Explained: ${explained_count}
  Pending: ${pending_count}
```

**Safety check:** If `.env` was created or modified, verify it is listed in `.gitignore`. If not, add `.env` to `.gitignore` before committing.

## 8. Commit

```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "docs(${padded_phase}): preparation report" --files "${phase_dir}/${padded_phase}-PREPARATION.md"
```

If mock files were generated, also commit those:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js commit "test(${padded_phase}): mock fixtures for validation" --files "test/mocks/"
```

## 9. Route to Validation

```
Preparation complete for Phase ${phase_number}: ${phase_name}.

---

## Next Up

Validate features against contracts (6-level check)

/bwb:validate ${phase_number}

/clear first → fresh context window
```

Update state:
```bash
node /Users/dustbit/.claude/bwb/bin/bwb.js state patch '{"Step": "prepare", "Status": "Preparation complete"}'
```

</process>

<success_criteria>
- [ ] CONTRACTS.md and SUMMARY files loaded
- [ ] Project type detected
- [ ] Scanner agent completed dependency discovery and auto-setup
- [ ] User asked about each external dependency (4 options)
- [ ] Credentials written to .env for "configure real" choices
- [ ] Explanations recorded for "let me explain" choices
- [ ] Mock fixtures generated for "mock it" choices
- [ ] PREPARATION.md written with complete status
- [ ] .env in .gitignore (if .env was created/modified)
- [ ] Results presented to user
- [ ] Routed to /bwb:validate
</success_criteria>
