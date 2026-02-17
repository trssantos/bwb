#!/usr/bin/env node

/**
 * BWB Tools — CLI utility for BWB (Build, Validate, Wire) workflow operations
 *
 * Usage: node bwb.js <command> [args] [--raw]
 *
 * Atomic Commands:
 *   state load                         Load project config + state
 *   state update <field> <value>       Update a STATE.md field
 *   state get [section]                Get STATE.md content or section
 *   state patch --field val ...        Batch update STATE.md fields
 *   state advance-plan                 Increment plan counter
 *   state record-metric --phase N      Record execution metrics
 *     --plan M --duration Xmin [--tasks N] [--files N]
 *   state update-progress              Recalculate progress bar
 *   state add-decision --summary "..." Add decision to STATE.md
 *     [--phase N] [--rationale "..."]
 *   state add-blocker --text "..."     Add blocker
 *   state resolve-blocker --text "..." Remove blocker
 *   state record-session               Update session continuity
 *     --stopped-at "..." [--resume-file path]
 *   state-snapshot                     Structured parse of STATE.md
 *   resolve-model <agent-type>         Get model for agent based on profile
 *   find-phase <phase>                 Find phase directory by number
 *   commit <message> [--files f1 f2]   Commit planning docs
 *   generate-slug <text>               Convert text to URL-safe slug
 *   current-timestamp [format]         Get timestamp (full|date|filename)
 *   verify-path-exists <path>          Check file/directory existence
 *   config-ensure-section              Initialize .planning/config.json
 *   config-set <key.path> <value>      Set config value
 *   history-digest                     Aggregate all SUMMARY.md data
 *   summary-extract <path> [--fields]  Extract structured data from SUMMARY.md
 *   phase-plan-index <phase>           Index plans with waves and status
 *
 * Phase Operations:
 *   phase add <description>            Append new phase to roadmap + create dir
 *   phase complete <phase>             Mark phase done, update state + roadmap
 *
 * Roadmap Operations:
 *   roadmap get-phase <phase>          Extract phase section from ROADMAP.md
 *   roadmap analyze                    Full roadmap parse with disk status
 *
 * Frontmatter CRUD:
 *   frontmatter get <file> [--field k] Extract frontmatter as JSON
 *   frontmatter set <file> --field k --value jsonVal
 *   frontmatter merge <file> --data '{json}'
 *   frontmatter validate <file> --schema plan|summary|validation
 *
 * Verification:
 *   verify plan-structure <file>       Check PLAN.md structure + tasks
 *   verify phase-completeness <phase>  Check all plans have summaries
 *
 * Contracts:
 *   contracts analyze                  Parse CONTRACTS.md into structured JSON
 *   validation status                  Parse VALIDATION.md per-feature results
 *
 * Compound Commands (workflow-specific initialization):
 *   init new-project                   All context for new-project workflow
 *   init plan-phase <phase>            All context for plan-phase workflow
 *   init execute-phase <phase>         All context for execute-phase workflow
 *   init contracts <phase>             All context for contract extraction
 *   init validate <phase>              All context for validation workflow
 *   init prepare <phase>               All context for prepare workflow
 *   init brownfield                    Detect existing project for /bwb:init
 *   init baseline                      Detect areas for /bwb:baseline
 *   init quick <description>           All context for quick workflow
 *   init resume                        All context for resume workflow
 *   init progress                      All context for progress workflow
 *   init phase-op <phase>              Generic phase operation context
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Model Profile Table ─────────────────────────────────────────────────────

const MODEL_PROFILES = {
  'bwb-researcher':   { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'bwb-planner':      { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'bwb-builder':      { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'bwb-validator':    { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'bwb-fixer':        { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'bwb-roadmapper':   { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'bwb-preparer':     { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'bwb-analyzer':     { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIncludeFlag(args) {
  const includeIndex = args.indexOf('--include');
  if (includeIndex === -1) return new Set();
  const includeValue = args[includeIndex + 1];
  if (!includeValue) return new Set();
  return new Set(includeValue.split(',').map(s => s.trim()));
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    fix_max_iterations: 5,
    fix_auto_retry: true,
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      model_profile: parsed.model_profile ?? defaults.model_profile,
      commit_docs: parsed.commit_docs ?? defaults.commit_docs,
      search_gitignored: parsed.search_gitignored ?? defaults.search_gitignored,
      fix_max_iterations: parsed.fix_max_iterations ?? defaults.fix_max_iterations,
      fix_auto_retry: parsed.fix_auto_retry ?? defaults.fix_auto_retry,
    };
  } catch {
    return defaults;
  }
}

function isGitIgnored(cwd, targetPath) {
  try {
    execSync('git check-ignore -q -- ' + targetPath.replace(/[^a-zA-Z0-9._\-/]/g, ''), {
      cwd,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function execGit(cwd, args) {
  try {
    const escaped = args.map(a => {
      if (/^[a-zA-Z0-9._\-/=:@]+$/.test(a)) return a;
      return "'" + a.replace(/'/g, "'\\''") + "'";
    });
    const stdout = execSync('git ' + escaped.join(' '), {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status ?? 1,
      stdout: (err.stdout ?? '').toString().trim(),
      stderr: (err.stderr ?? '').toString().trim(),
    };
  }
}

function normalizePhaseName(phase) {
  const match = phase.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return phase;
  const num = match[1];
  const parts = num.split('.');
  const padded = parts[0].padStart(2, '0');
  return parts.length > 1 ? `${padded}.${parts[1]}` : padded;
}

function extractFrontmatter(content) {
  const frontmatter = {};
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return frontmatter;

  const yaml = match[1];
  const lines = yaml.split('\n');

  let stack = [{ obj: frontmatter, key: null, indent: -1 }];

  for (const line of lines) {
    if (line.trim() === '') continue;

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)/);
    if (keyMatch) {
      const key = keyMatch[2];
      const value = keyMatch[3].trim();

      if (value === '' || value === '[') {
        current.obj[key] = value === '[' ? [] : {};
        current.key = null;
        stack.push({ obj: current.obj[key], key: null, indent });
      } else if (value.startsWith('[') && value.endsWith(']')) {
        current.obj[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        current.key = null;
      } else {
        current.obj[key] = value.replace(/^["']|["']$/g, '');
        current.key = null;
      }
    } else if (line.trim().startsWith('- ')) {
      const itemValue = line.trim().slice(2).replace(/^["']|["']$/g, '');

      if (typeof current.obj === 'object' && !Array.isArray(current.obj) && Object.keys(current.obj).length === 0) {
        const parent = stack.length > 1 ? stack[stack.length - 2] : null;
        if (parent) {
          for (const k of Object.keys(parent.obj)) {
            if (parent.obj[k] === current.obj) {
              parent.obj[k] = [itemValue];
              current.obj = parent.obj[k];
              break;
            }
          }
        }
      } else if (Array.isArray(current.obj)) {
        current.obj.push(itemValue);
      }
    }
  }

  return frontmatter;
}

function reconstructFrontmatter(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else if (value.every(v => typeof v === 'string') && value.length <= 3 && value.join(', ').length < 60) {
        lines.push(`${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${typeof item === 'string' && (item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [subkey, subval] of Object.entries(value)) {
        if (subval === null || subval === undefined) continue;
        if (Array.isArray(subval)) {
          if (subval.length === 0) {
            lines.push(`  ${subkey}: []`);
          } else if (subval.every(v => typeof v === 'string') && subval.length <= 3 && subval.join(', ').length < 60) {
            lines.push(`  ${subkey}: [${subval.join(', ')}]`);
          } else {
            lines.push(`  ${subkey}:`);
            for (const item of subval) {
              lines.push(`    - ${typeof item === 'string' && (item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
            }
          }
        } else if (typeof subval === 'object') {
          lines.push(`  ${subkey}:`);
          for (const [subsubkey, subsubval] of Object.entries(subval)) {
            if (subsubval === null || subsubval === undefined) continue;
            if (Array.isArray(subsubval)) {
              if (subsubval.length === 0) {
                lines.push(`    ${subsubkey}: []`);
              } else {
                lines.push(`    ${subsubkey}:`);
                for (const item of subsubval) {
                  lines.push(`      - ${item}`);
                }
              }
            } else {
              lines.push(`    ${subsubkey}: ${subsubval}`);
            }
          }
        } else {
          const sv = String(subval);
          lines.push(`  ${subkey}: ${sv.includes(':') || sv.includes('#') ? `"${sv}"` : sv}`);
        }
      }
    } else {
      const sv = String(value);
      if (sv.includes(':') || sv.includes('#') || sv.startsWith('[') || sv.startsWith('{')) {
        lines.push(`${key}: "${sv}"`);
      } else {
        lines.push(`${key}: ${sv}`);
      }
    }
  }
  return lines.join('\n');
}

function spliceFrontmatter(content, newObj) {
  const yamlStr = reconstructFrontmatter(newObj);
  const match = content.match(/^---\n[\s\S]+?\n---/);
  if (match) {
    return `---\n${yamlStr}\n---` + content.slice(match[0].length);
  }
  return `---\n${yamlStr}\n---\n\n` + content;
}

function output(result, raw, rawValue) {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }
  process.exit(0);
}

function error(message) {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function resolveModelInternal(cwd, agentType) {
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) return 'sonnet';
  return agentModels[profile] || agentModels['balanced'] || 'sonnet';
}

function findPhaseInternal(cwd, phase) {
  if (!phase) return null;

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const unpadded = normalized.replace(/^0+(\d)/, '$1');
    const match = dirs.find(d => d.startsWith(normalized + '-') || d.startsWith(unpadded + '-') || d === normalized || d === unpadded);
    if (!match) return null;

    const dirMatch = match.match(/^(\d+(?:\.\d+)?)-?(.*)/);
    const phaseNumber = dirMatch ? dirMatch[1] : normalized;
    const phaseName = dirMatch && dirMatch[2] ? dirMatch[2] : null;
    const phaseDir = path.join(phasesDir, match);
    const phaseFiles = fs.readdirSync(phaseDir);

    const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
    const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').sort();
    const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
    const hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
    const hasContracts = phaseFiles.some(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
    const hasValidation = phaseFiles.some(f => f.endsWith('-VALIDATION.md') || f === 'VALIDATION.md');
    const hasPreparation = phaseFiles.some(f => f.endsWith('-PREPARATION.md') || f === 'PREPARATION.md');

    const completedPlanIds = new Set(
      summaries.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', ''))
    );
    const incompletePlans = plans.filter(p => {
      const planId = p.replace('-PLAN.md', '').replace('PLAN.md', '');
      return !completedPlanIds.has(planId);
    });

    return {
      found: true,
      directory: path.join('.planning', 'phases', match),
      phase_number: phaseNumber,
      phase_name: phaseName,
      phase_slug: phaseName ? phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null,
      plans,
      summaries,
      incomplete_plans: incompletePlans,
      has_research: hasResearch,
      has_context: hasContext,
      has_contracts: hasContracts,
      has_validation: hasValidation,
      has_preparation: hasPreparation,
    };
  } catch {
    return null;
  }
}

function pathExistsInternal(cwd, targetPath) {
  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);
  try {
    fs.statSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

function generateSlugInternal(text) {
  if (!text) return null;
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Basic Commands ──────────────────────────────────────────────────────────

function cmdGenerateSlug(text, raw) {
  if (!text) error('text required for slug generation');
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  output({ slug }, raw, slug);
}

function cmdCurrentTimestamp(format, raw) {
  const now = new Date();
  let result;
  switch (format) {
    case 'date': result = now.toISOString().split('T')[0]; break;
    case 'filename': result = now.toISOString().replace(/:/g, '-').replace(/\..+/, ''); break;
    default: result = now.toISOString(); break;
  }
  output({ timestamp: result }, raw, result);
}

function cmdVerifyPathExists(cwd, targetPath, raw) {
  if (!targetPath) error('path required for verification');
  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);
  try {
    const stats = fs.statSync(fullPath);
    const type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other';
    output({ exists: true, type }, raw, 'true');
  } catch {
    output({ exists: false, type: null }, raw, 'false');
  }
}

function cmdConfigEnsureSection(cwd, raw) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const planningDir = path.join(cwd, '.planning');

  try {
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }
  } catch (err) {
    error('Failed to create .planning directory: ' + err.message);
  }

  if (fs.existsSync(configPath)) {
    output({ created: false, reason: 'already_exists' }, raw, 'exists');
    return;
  }

  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8');
    output({ created: true, path: '.planning/config.json' }, raw, 'created');
  } catch (err) {
    error('Failed to create config.json: ' + err.message);
  }
}

function cmdConfigSet(cwd, keyPath, value, raw) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  if (!keyPath) error('Usage: config-set <key.path> <value>');

  let parsedValue = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(value) && value !== '') parsedValue = Number(value);

  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    error('Failed to read config.json: ' + err.message);
  }

  const keys = keyPath.split('.');
  let current = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = parsedValue;

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    output({ updated: true, key: keyPath, value: parsedValue }, raw, `${keyPath}=${parsedValue}`);
  } catch (err) {
    error('Failed to write config.json: ' + err.message);
  }
}

// ─── History Digest ──────────────────────────────────────────────────────────

function cmdHistoryDigest(cwd, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const digest = { phases: {}, decisions: [], tech_stack: new Set() };

  if (!fs.existsSync(phasesDir)) {
    digest.tech_stack = [];
    output(digest, raw);
    return;
  }

  try {
    const phaseDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of phaseDirs) {
      const dirPath = path.join(phasesDir, dir);
      const summaries = fs.readdirSync(dirPath).filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

      for (const summary of summaries) {
        try {
          const content = fs.readFileSync(path.join(dirPath, summary), 'utf-8');
          const fm = extractFrontmatter(content);
          const phaseNum = fm.phase || dir.split('-')[0];

          if (!digest.phases[phaseNum]) {
            digest.phases[phaseNum] = {
              name: fm.name || dir.split('-').slice(1).join(' ') || 'Unknown',
              provides: new Set(),
              affects: new Set(),
              patterns: new Set(),
              contracts_addressed: new Set(),
            };
          }

          if (fm['dependency-graph'] && fm['dependency-graph'].provides) {
            fm['dependency-graph'].provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          } else if (fm.provides) {
            fm.provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          }

          if (fm['dependency-graph'] && fm['dependency-graph'].affects) {
            fm['dependency-graph'].affects.forEach(a => digest.phases[phaseNum].affects.add(a));
          }

          if (fm['patterns-established']) {
            fm['patterns-established'].forEach(p => digest.phases[phaseNum].patterns.add(p));
          }

          if (fm['contracts_addressed']) {
            const ca = Array.isArray(fm['contracts_addressed']) ? fm['contracts_addressed'] : [fm['contracts_addressed']];
            ca.forEach(c => digest.phases[phaseNum].contracts_addressed.add(c));
          }

          if (fm['key-decisions']) {
            fm['key-decisions'].forEach(d => {
              digest.decisions.push({ phase: phaseNum, decision: d });
            });
          }

          if (fm['tech-stack'] && fm['tech-stack'].added) {
            fm['tech-stack'].added.forEach(t => digest.tech_stack.add(typeof t === 'string' ? t : t.name));
          }
        } catch {}
      }
    }

    Object.keys(digest.phases).forEach(p => {
      digest.phases[p].provides = [...digest.phases[p].provides];
      digest.phases[p].affects = [...digest.phases[p].affects];
      digest.phases[p].patterns = [...digest.phases[p].patterns];
      digest.phases[p].contracts_addressed = [...digest.phases[p].contracts_addressed];
    });
    digest.tech_stack = [...digest.tech_stack];

    output(digest, raw);
  } catch (e) {
    error('Failed to generate history digest: ' + e.message);
  }
}

// ─── Phase Listing ───────────────────────────────────────────────────────────

function cmdPhasesList(cwd, options, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const { type, phase } = options;

  if (!fs.existsSync(phasesDir)) {
    output(type ? { files: [], count: 0 } : { directories: [], count: 0 }, raw, '');
    return;
  }

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    let dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    dirs.sort((a, b) => {
      const aNum = parseFloat(a.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      const bNum = parseFloat(b.match(/^(\d+(?:\.\d+)?)/)?.[1] || '0');
      return aNum - bNum;
    });

    if (phase) {
      const normalized = normalizePhaseName(phase);
      const unpadded = normalized.replace(/^0+(\d)/, '$1');
      const match = dirs.find(d => d.startsWith(normalized + '-') || d.startsWith(unpadded + '-') || d === normalized || d === unpadded);
      if (!match) {
        output({ files: [], count: 0, phase_dir: null, error: 'Phase not found' }, raw, '');
        return;
      }
      dirs = [match];
    }

    if (type) {
      const files = [];
      for (const dir of dirs) {
        const dirPath = path.join(phasesDir, dir);
        const dirFiles = fs.readdirSync(dirPath);
        let filtered;
        if (type === 'plans') filtered = dirFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
        else if (type === 'summaries') filtered = dirFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        else filtered = dirFiles;
        files.push(...filtered.sort());
      }
      output({ files, count: files.length, phase_dir: phase ? dirs[0] : null }, raw, files.join('\n'));
      return;
    }

    const dirInfos = dirs.map(d => {
      const dm = d.match(/^(\d+(?:\.\d+)?)-?(.*)/);
      return { name: d, number: dm ? dm[1] : d, slug: dm ? dm[2] : '' };
    });
    output({ directories: dirInfos, count: dirs.length }, raw, dirs.join('\n'));
  } catch (e) {
    error('Failed to list phases: ' + e.message);
  }
}

// ─── Roadmap Operations ──────────────────────────────────────────────────────

function cmdRoadmapGetPhase(cwd, phaseNum, raw) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    output({ found: false, error: 'ROADMAP.md not found' }, raw, '');
    return;
  }

  try {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    const escapedPhase = phaseNum.replace(/\./g, '\\.');
    const phasePattern = new RegExp(`###\\s*Phase\\s+${escapedPhase}:\\s*([^\\n]+)`, 'i');
    const headerMatch = content.match(phasePattern);

    if (!headerMatch) {
      output({ found: false, phase_number: phaseNum }, raw, '');
      return;
    }

    const phaseName = headerMatch[1].trim();
    const headerIndex = headerMatch.index;
    const restOfContent = content.slice(headerIndex);
    const nextHeaderMatch = restOfContent.match(/\n###\s+Phase\s+\d/i);
    const sectionEnd = nextHeaderMatch ? headerIndex + nextHeaderMatch.index : content.length;
    const section = content.slice(headerIndex, sectionEnd).trim();
    const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;

    output({ found: true, phase_number: phaseNum, phase_name: phaseName, goal, section }, raw, section);
  } catch (e) {
    error('Failed to read ROADMAP.md: ' + e.message);
  }
}

function cmdRoadmapAnalyze(cwd, raw) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    output({ error: 'ROADMAP.md not found', phases: [], current_phase: null }, raw);
    return;
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const phasesDir = path.join(cwd, '.planning', 'phases');

  const phasePattern = /###\s*Phase\s+(\d+(?:\.\d+)?)\s*:\s*([^\n]+)/gi;
  const phases = [];
  let match;

  while ((match = phasePattern.exec(content)) !== null) {
    const phaseNum = match[1];
    const phaseName = match[2].trim();
    const sectionStart = match.index;
    const restOfContent = content.slice(sectionStart);
    const nextHeader = restOfContent.match(/\n###\s+Phase\s+\d/i);
    const sectionEnd = nextHeader ? sectionStart + nextHeader.index : content.length;
    const section = content.slice(sectionStart, sectionEnd);

    const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;
    const dependsMatch = section.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);
    const depends_on = dependsMatch ? dependsMatch[1].trim() : null;

    const normalized = normalizePhaseName(phaseNum);
    let diskStatus = 'no_directory';
    let planCount = 0;
    let summaryCount = 0;
    let hasContext = false;
    let hasResearch = false;
    let hasContracts = false;
    let hasValidation = false;

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      const dirMatch = dirs.find(d => d.startsWith(normalized + '-') || d === normalized);

      if (dirMatch) {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dirMatch));
        planCount = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
        summaryCount = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;
        hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
        hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
        hasContracts = phaseFiles.some(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
        hasValidation = phaseFiles.some(f => f.endsWith('-VALIDATION.md') || f === 'VALIDATION.md');

        if (summaryCount >= planCount && planCount > 0) diskStatus = 'complete';
        else if (summaryCount > 0) diskStatus = 'partial';
        else if (planCount > 0) diskStatus = 'planned';
        else if (hasContracts) diskStatus = 'contracted';
        else if (hasContext) diskStatus = 'discussed';
        else if (hasResearch) diskStatus = 'researched';
        else diskStatus = 'empty';
      }
    } catch {}

    const checkboxPattern = new RegExp(`-\\s*\\[(x| )\\]\\s*.*Phase\\s+${phaseNum.replace('.', '\\.')}`, 'i');
    const checkboxMatch = content.match(checkboxPattern);
    const roadmapComplete = checkboxMatch ? checkboxMatch[1] === 'x' : false;

    phases.push({
      number: phaseNum, name: phaseName, goal, depends_on,
      plan_count: planCount, summary_count: summaryCount,
      has_context: hasContext, has_research: hasResearch,
      has_contracts: hasContracts, has_validation: hasValidation,
      disk_status: diskStatus, roadmap_complete: roadmapComplete,
    });
  }

  const currentPhase = phases.find(p => p.disk_status === 'planned' || p.disk_status === 'partial') || null;
  const nextPhase = phases.find(p => ['empty', 'no_directory', 'discussed', 'researched', 'contracted'].includes(p.disk_status)) || null;

  const totalPlans = phases.reduce((sum, p) => sum + p.plan_count, 0);
  const totalSummaries = phases.reduce((sum, p) => sum + p.summary_count, 0);
  const completedPhases = phases.filter(p => p.disk_status === 'complete').length;

  output({
    phases,
    phase_count: phases.length,
    completed_phases: completedPhases,
    total_plans: totalPlans,
    total_summaries: totalSummaries,
    progress_percent: totalPlans > 0 ? Math.round((totalSummaries / totalPlans) * 100) : 0,
    current_phase: currentPhase ? currentPhase.number : null,
    next_phase: nextPhase ? nextPhase.number : null,
  }, raw);
}

// ─── State Management ────────────────────────────────────────────────────────

function cmdStateLoad(cwd, raw) {
  const config = loadConfig(cwd);
  const planningDir = path.join(cwd, '.planning');
  let stateRaw = '';
  try { stateRaw = fs.readFileSync(path.join(planningDir, 'STATE.md'), 'utf-8'); } catch {}

  const configExists = fs.existsSync(path.join(planningDir, 'config.json'));
  const roadmapExists = fs.existsSync(path.join(planningDir, 'ROADMAP.md'));
  const stateExists = stateRaw.length > 0;

  const result = { config, state_raw: stateRaw, state_exists: stateExists, roadmap_exists: roadmapExists, config_exists: configExists };

  if (raw) {
    const c = config;
    const lines = [
      `model_profile=${c.model_profile}`,
      `commit_docs=${c.commit_docs}`,
      `search_gitignored=${c.search_gitignored}`,
      `config_exists=${configExists}`,
      `roadmap_exists=${roadmapExists}`,
      `state_exists=${stateExists}`,
    ];
    process.stdout.write(lines.join('\n'));
    process.exit(0);
  }

  output(result);
}

function cmdStateGet(cwd, section, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    if (!section) { output({ content }, raw, content); return; }

    const fieldEscaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fieldPattern = new RegExp(`\\*\\*${fieldEscaped}:\\*\\*\\s*(.*)`, 'i');
    const fieldMatch = content.match(fieldPattern);
    if (fieldMatch) { output({ [section]: fieldMatch[1].trim() }, raw, fieldMatch[1].trim()); return; }

    const sectionPattern = new RegExp(`##\\s*${fieldEscaped}\\s*\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const sectionMatch = content.match(sectionPattern);
    if (sectionMatch) { output({ [section]: sectionMatch[1].trim() }, raw, sectionMatch[1].trim()); return; }

    output({ error: `Section or field "${section}" not found` }, raw, '');
  } catch {
    error('STATE.md not found');
  }
}

function cmdStatePatch(cwd, patches, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    let content = fs.readFileSync(statePath, 'utf-8');
    const results = { updated: [], failed: [] };

    for (const [field, value] of Object.entries(patches)) {
      const fieldEscaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(\\*\\*${fieldEscaped}:\\*\\*\\s*)(.*)`, 'i');
      if (pattern.test(content)) {
        content = content.replace(pattern, `$1${value}`);
        results.updated.push(field);
      } else {
        results.failed.push(field);
      }
    }

    if (results.updated.length > 0) fs.writeFileSync(statePath, content, 'utf-8');
    output(results, raw, results.updated.length > 0 ? 'true' : 'false');
  } catch {
    error('STATE.md not found');
  }
}

function cmdStateUpdate(cwd, field, value) {
  if (!field || value === undefined) error('field and value required for state update');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  try {
    let content = fs.readFileSync(statePath, 'utf-8');
    const fieldEscaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(\\*\\*${fieldEscaped}:\\*\\*\\s*)(.*)`, 'i');
    if (pattern.test(content)) {
      content = content.replace(pattern, `$1${value}`);
      fs.writeFileSync(statePath, content, 'utf-8');
      output({ updated: true });
    } else {
      output({ updated: false, reason: `Field "${field}" not found in STATE.md` });
    }
  } catch {
    output({ updated: false, reason: 'STATE.md not found' });
  }
}

function stateExtractField(content, fieldName) {
  const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function stateReplaceField(content, fieldName, newValue) {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');
  if (pattern.test(content)) return content.replace(pattern, `$1${newValue}`);
  return null;
}

function cmdStateAdvancePlan(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const currentPlan = parseInt(stateExtractField(content, 'Current Plan'), 10);
  const totalPlans = parseInt(stateExtractField(content, 'Total Plans in Phase'), 10);
  const today = new Date().toISOString().split('T')[0];

  if (isNaN(currentPlan) || isNaN(totalPlans)) {
    output({ error: 'Cannot parse Current Plan or Total Plans in Phase from STATE.md' }, raw);
    return;
  }

  if (currentPlan >= totalPlans) {
    content = stateReplaceField(content, 'Status', 'Phase complete — ready for validation') || content;
    content = stateReplaceField(content, 'Last Activity', today) || content;
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ advanced: false, reason: 'last_plan', current_plan: currentPlan, total_plans: totalPlans, status: 'ready_for_validation' }, raw, 'false');
  } else {
    const newPlan = currentPlan + 1;
    content = stateReplaceField(content, 'Current Plan', String(newPlan)) || content;
    content = stateReplaceField(content, 'Status', 'Ready to execute') || content;
    content = stateReplaceField(content, 'Last Activity', today) || content;
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ advanced: true, previous_plan: currentPlan, current_plan: newPlan, total_plans: totalPlans }, raw, 'true');
  }
}

function cmdStateRecordMetric(cwd, options, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const { phase, plan, duration, tasks, files } = options;
  if (!phase || !plan || !duration) { output({ error: 'phase, plan, and duration required' }, raw); return; }

  const metricsPattern = /(##\s*Performance Metrics[\s\S]*?\n\|[^\n]+\n\|[-|\s]+\n)([\s\S]*?)(?=\n##|\n$|$)/i;
  const metricsMatch = content.match(metricsPattern);

  if (metricsMatch) {
    const tableHeader = metricsMatch[1];
    let tableBody = metricsMatch[2].trimEnd();
    const newRow = `| Phase ${phase} P${plan} | ${duration} | ${tasks || '-'} tasks | ${files || '-'} files |`;
    tableBody = (tableBody.trim() === '' || tableBody.includes('None yet')) ? newRow : tableBody + '\n' + newRow;
    content = content.replace(metricsPattern, `${tableHeader}${tableBody}\n`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ recorded: true, phase, plan, duration }, raw, 'true');
  } else {
    output({ recorded: false, reason: 'Performance Metrics section not found' }, raw, 'false');
  }
}

function cmdStateUpdateProgress(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  let totalPlans = 0;
  let totalSummaries = 0;

  if (fs.existsSync(phasesDir)) {
    const phaseDirs = fs.readdirSync(phasesDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    for (const dir of phaseDirs) {
      const files = fs.readdirSync(path.join(phasesDir, dir));
      totalPlans += files.filter(f => f.match(/-PLAN\.md$/i)).length;
      totalSummaries += files.filter(f => f.match(/-SUMMARY\.md$/i)).length;
    }
  }

  const percent = totalPlans > 0 ? Math.round(totalSummaries / totalPlans * 100) : 0;
  const barWidth = 10;
  const filled = Math.round(percent / 100 * barWidth);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
  const progressStr = `[${bar}] ${percent}%`;

  const progressPattern = /(\*\*Progress:\*\*\s*).*/i;
  if (progressPattern.test(content)) {
    content = content.replace(progressPattern, `$1${progressStr}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ updated: true, percent, completed: totalSummaries, total: totalPlans, bar: progressStr }, raw, progressStr);
  } else {
    output({ updated: false, reason: 'Progress field not found' }, raw, 'false');
  }
}

function cmdStateAddDecision(cwd, options, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }
  const { phase, summary, rationale } = options;
  if (!summary) { output({ error: 'summary required' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const entry = `- [Phase ${phase || '?'}]: ${summary}${rationale ? ` — ${rationale}` : ''}`;

  const sectionPattern = /(###?\s*(?:Decisions|Decisions Made|Accumulated.*Decisions)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);
  if (match) {
    let sectionBody = match[2];
    sectionBody = sectionBody.replace(/None yet\.?\s*\n?/gi, '').replace(/No decisions yet\.?\s*\n?/gi, '');
    sectionBody = sectionBody.trimEnd() + '\n' + entry + '\n';
    content = content.replace(sectionPattern, `${match[1]}${sectionBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ added: true, decision: entry }, raw, 'true');
  } else {
    output({ added: false, reason: 'Decisions section not found' }, raw, 'false');
  }
}

function cmdStateAddBlocker(cwd, text, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }
  if (!text) { output({ error: 'text required' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const sectionPattern = /(###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);
  if (match) {
    let sectionBody = match[2];
    sectionBody = sectionBody.replace(/None\.?\s*\n?/gi, '').replace(/None yet\.?\s*\n?/gi, '');
    sectionBody = sectionBody.trimEnd() + '\n- ' + text + '\n';
    content = content.replace(sectionPattern, `${match[1]}${sectionBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ added: true, blocker: text }, raw, 'true');
  } else {
    output({ added: false, reason: 'Blockers section not found' }, raw, 'false');
  }
}

function cmdStateResolveBlocker(cwd, text, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }
  if (!text) { output({ error: 'text required' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const sectionPattern = /(###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);
  if (match) {
    const lines = match[2].split('\n');
    const filtered = lines.filter(line => {
      if (!line.startsWith('- ')) return true;
      return !line.toLowerCase().includes(text.toLowerCase());
    });
    let newBody = filtered.join('\n');
    if (!newBody.trim() || !newBody.includes('- ')) newBody = 'None\n';
    content = content.replace(sectionPattern, `${match[1]}${newBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ resolved: true, blocker: text }, raw, 'true');
  } else {
    output({ resolved: false, reason: 'Blockers section not found' }, raw, 'false');
  }
}

function cmdStateRecordSession(cwd, options, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  let content = fs.readFileSync(statePath, 'utf-8');
  const now = new Date().toISOString();
  const updated = [];

  let result = stateReplaceField(content, 'Last session', now);
  if (result) { content = result; updated.push('Last session'); }
  result = stateReplaceField(content, 'Last Date', now);
  if (result) { content = result; updated.push('Last Date'); }

  if (options.stopped_at) {
    result = stateReplaceField(content, 'Stopped At', options.stopped_at);
    if (!result) result = stateReplaceField(content, 'Stopped at', options.stopped_at);
    if (result) { content = result; updated.push('Stopped At'); }
  }

  const resumeFile = options.resume_file || 'None';
  result = stateReplaceField(content, 'Resume File', resumeFile);
  if (!result) result = stateReplaceField(content, 'Resume file', resumeFile);
  if (result) { content = result; updated.push('Resume File'); }

  if (updated.length > 0) {
    fs.writeFileSync(statePath, content, 'utf-8');
    output({ recorded: true, updated }, raw, 'true');
  } else {
    output({ recorded: false, reason: 'No session fields found' }, raw, 'false');
  }
}

function cmdStateSnapshot(cwd, raw) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) { output({ error: 'STATE.md not found' }, raw); return; }

  const content = fs.readFileSync(statePath, 'utf-8');
  const extractField = (fieldName) => {
    const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : null;
  };

  const currentPhase = extractField('Current Phase');
  const currentPhaseName = extractField('Current Phase Name');
  const totalPhasesRaw = extractField('Total Phases');
  const currentPlan = extractField('Current Plan');
  const totalPlansRaw = extractField('Total Plans in Phase');
  const status = extractField('Status');
  const step = extractField('Step');
  const progressRaw = extractField('Progress');
  const lastActivity = extractField('Last Activity');

  const decisions = [];
  const decisionsMatch = content.match(/###?\s*Decisions[\s\S]*?\n([\s\S]*?)(?=\n###?|\n##[^#]|$)/i);
  if (decisionsMatch) {
    const items = decisionsMatch[1].match(/^-\s+(.+)$/gm) || [];
    for (const item of items) {
      decisions.push(item.replace(/^-\s+/, '').trim());
    }
  }

  const blockers = [];
  const blockersMatch = content.match(/###?\s*Blockers[\s\S]*?\n([\s\S]*?)(?=\n###?|\n##[^#]|$)/i);
  if (blockersMatch) {
    const items = blockersMatch[1].match(/^-\s+(.+)$/gm) || [];
    for (const item of items) {
      const text = item.replace(/^-\s+/, '').trim();
      if (text.toLowerCase() !== 'none') blockers.push(text);
    }
  }

  output({
    current_phase: currentPhase,
    current_phase_name: currentPhaseName,
    total_phases: totalPhasesRaw ? parseInt(totalPhasesRaw, 10) : null,
    current_plan: currentPlan,
    total_plans_in_phase: totalPlansRaw ? parseInt(totalPlansRaw, 10) : null,
    status,
    step,
    progress_percent: progressRaw ? parseInt(progressRaw.replace('%', ''), 10) : null,
    last_activity: lastActivity,
    decisions,
    blockers,
  }, raw);
}

// ─── Model Resolution + Phase Finding ────────────────────────────────────────

function cmdResolveModel(cwd, agentType, raw) {
  if (!agentType) error('agent-type required');
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) {
    output({ model: 'sonnet', profile, unknown_agent: true }, raw, 'sonnet');
    return;
  }
  const model = agentModels[profile] || agentModels['balanced'] || 'sonnet';
  output({ model, profile }, raw, model);
}

function cmdFindPhase(cwd, phase, raw) {
  if (!phase) error('phase identifier required');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);
  const notFound = { found: false, directory: null, phase_number: null, phase_name: null, plans: [], summaries: [] };

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const unpadded = normalized.replace(/^0+(\d)/, '$1');
    const match = dirs.find(d => d.startsWith(normalized + '-') || d.startsWith(unpadded + '-') || d === normalized || d === unpadded);
    if (!match) { output(notFound, raw, ''); return; }

    const dirMatch = match.match(/^(\d+(?:\.\d+)?)-?(.*)/);
    const phaseNumber = dirMatch ? dirMatch[1] : normalized;
    const phaseName = dirMatch && dirMatch[2] ? dirMatch[2] : null;
    const phaseDir = path.join(phasesDir, match);
    const phaseFiles = fs.readdirSync(phaseDir);
    const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
    const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').sort();

    output({
      found: true,
      directory: path.join('.planning', 'phases', match),
      phase_number: phaseNumber,
      phase_name: phaseName,
      plans,
      summaries,
    }, raw, path.join('.planning', 'phases', match));
  } catch {
    output(notFound, raw, '');
  }
}

// ─── Git Operations ──────────────────────────────────────────────────────────

function cmdCommit(cwd, message, files, raw, amend) {
  if (!message && !amend) error('commit message required');
  const config = loadConfig(cwd);

  if (!config.commit_docs) {
    output({ committed: false, hash: null, reason: 'skipped_commit_docs_false' }, raw, 'skipped');
    return;
  }

  if (isGitIgnored(cwd, '.planning')) {
    output({ committed: false, hash: null, reason: 'skipped_gitignored' }, raw, 'skipped');
    return;
  }

  const filesToStage = files && files.length > 0 ? files : ['.planning/'];
  for (const file of filesToStage) {
    execGit(cwd, ['add', file]);
  }

  const commitArgs = amend ? ['commit', '--amend', '--no-edit'] : ['commit', '-m', message];
  const commitResult = execGit(cwd, commitArgs);
  if (commitResult.exitCode !== 0) {
    if (commitResult.stdout.includes('nothing to commit') || commitResult.stderr.includes('nothing to commit')) {
      output({ committed: false, hash: null, reason: 'nothing_to_commit' }, raw, 'nothing');
      return;
    }
    output({ committed: false, hash: null, reason: 'nothing_to_commit', error: commitResult.stderr }, raw, 'nothing');
    return;
  }

  const hashResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const hash = hashResult.exitCode === 0 ? hashResult.stdout : null;
  output({ committed: true, hash, reason: 'committed' }, raw, hash || 'committed');
}

// ─── Frontmatter CRUD ────────────────────────────────────────────────────────

function cmdFrontmatterGet(cwd, filePath, field, raw) {
  if (!filePath) error('file path required');
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }
  const fm = extractFrontmatter(content);
  if (field) {
    const value = fm[field];
    if (value === undefined) { output({ error: 'Field not found', field }, raw); return; }
    output({ [field]: value }, raw, JSON.stringify(value));
  } else {
    output(fm, raw);
  }
}

function cmdFrontmatterSet(cwd, filePath, field, value, raw) {
  if (!filePath || !field || value === undefined) error('file, field, and value required');
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  if (!fs.existsSync(fullPath)) { output({ error: 'File not found', path: filePath }, raw); return; }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);
  let parsedValue;
  try { parsedValue = JSON.parse(value); } catch { parsedValue = value; }
  fm[field] = parsedValue;
  fs.writeFileSync(fullPath, spliceFrontmatter(content, fm), 'utf-8');
  output({ updated: true, field, value: parsedValue }, raw, 'true');
}

function cmdFrontmatterMerge(cwd, filePath, data, raw) {
  if (!filePath || !data) error('file and data required');
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  if (!fs.existsSync(fullPath)) { output({ error: 'File not found', path: filePath }, raw); return; }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);
  let mergeData;
  try { mergeData = JSON.parse(data); } catch { error('Invalid JSON for --data'); return; }
  Object.assign(fm, mergeData);
  fs.writeFileSync(fullPath, spliceFrontmatter(content, fm), 'utf-8');
  output({ merged: true, fields: Object.keys(mergeData) }, raw, 'true');
}

const FRONTMATTER_SCHEMAS = {
  plan: { required: ['phase', 'plan', 'type', 'wave', 'depends_on', 'files_modified', 'autonomous', 'contracts'] },
  summary: { required: ['phase', 'plan', 'subsystem', 'tags', 'duration', 'completed', 'contracts_addressed'] },
  validation: { required: ['phase', 'validated', 'status'] },
};

function cmdFrontmatterValidate(cwd, filePath, schemaName, raw) {
  if (!filePath || !schemaName) error('file and schema required');
  const schema = FRONTMATTER_SCHEMAS[schemaName];
  if (!schema) error(`Unknown schema: ${schemaName}. Available: ${Object.keys(FRONTMATTER_SCHEMAS).join(', ')}`);
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }
  const fm = extractFrontmatter(content);
  const missing = schema.required.filter(f => fm[f] === undefined);
  const present = schema.required.filter(f => fm[f] !== undefined);
  output({ valid: missing.length === 0, missing, present, schema: schemaName }, raw, missing.length === 0 ? 'valid' : 'invalid');
}

// ─── Verification ────────────────────────────────────────────────────────────

function cmdVerifyPlanStructure(cwd, filePath, raw) {
  if (!filePath) error('file path required');
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) { output({ error: 'File not found', path: filePath }, raw); return; }

  const fm = extractFrontmatter(content);
  const errors = [];
  const warnings = [];

  const required = ['phase', 'plan', 'type', 'wave', 'depends_on', 'files_modified', 'autonomous', 'contracts'];
  for (const field of required) {
    if (fm[field] === undefined) errors.push(`Missing required frontmatter field: ${field}`);
  }

  // Check contracts field is a non-empty array
  if (fm.contracts !== undefined) {
    if (!Array.isArray(fm.contracts) || fm.contracts.length === 0) {
      warnings.push('contracts field should be a non-empty array of FEAT-NN references');
    }
  }

  const taskPattern = /<task[^>]*>([\s\S]*?)<\/task>/g;
  const tasks = [];
  let taskMatch;
  while ((taskMatch = taskPattern.exec(content)) !== null) {
    const taskContent = taskMatch[1];
    const nameMatch = taskContent.match(/<name>([\s\S]*?)<\/name>/);
    const taskName = nameMatch ? nameMatch[1].trim() : 'unnamed';
    const hasFiles = /<files>/.test(taskContent);
    const hasAction = /<action>/.test(taskContent);
    const hasVerify = /<verify>/.test(taskContent);
    const hasDone = /<done>/.test(taskContent);

    if (!nameMatch) errors.push('Task missing <name> element');
    if (!hasAction) errors.push(`Task '${taskName}' missing <action>`);
    if (!hasVerify) warnings.push(`Task '${taskName}' missing <verify>`);
    if (!hasDone) warnings.push(`Task '${taskName}' missing <done>`);
    if (!hasFiles) warnings.push(`Task '${taskName}' missing <files>`);

    tasks.push({ name: taskName, hasFiles, hasAction, hasVerify, hasDone });
  }

  if (tasks.length === 0) warnings.push('No <task> elements found');

  if (fm.wave && parseInt(fm.wave) > 1 && (!fm.depends_on || (Array.isArray(fm.depends_on) && fm.depends_on.length === 0))) {
    warnings.push('Wave > 1 but depends_on is empty');
  }

  output({
    valid: errors.length === 0,
    errors,
    warnings,
    task_count: tasks.length,
    tasks,
    frontmatter_fields: Object.keys(fm),
  }, raw, errors.length === 0 ? 'valid' : 'invalid');
}

function cmdVerifyPhaseCompleteness(cwd, phase, raw) {
  if (!phase) error('phase required');
  const phaseInfo = findPhaseInternal(cwd, phase);
  if (!phaseInfo || !phaseInfo.found) { output({ error: 'Phase not found', phase }, raw); return; }

  const errors = [];
  const warnings = [];
  const phaseDir = path.join(cwd, phaseInfo.directory);
  let files;
  try { files = fs.readdirSync(phaseDir); } catch { output({ error: 'Cannot read phase directory' }, raw); return; }

  const plans = files.filter(f => f.match(/-PLAN\.md$/i));
  const summaries = files.filter(f => f.match(/-SUMMARY\.md$/i));
  const planIds = new Set(plans.map(p => p.replace(/-PLAN\.md$/i, '')));
  const summaryIds = new Set(summaries.map(s => s.replace(/-SUMMARY\.md$/i, '')));

  const incompletePlans = [...planIds].filter(id => !summaryIds.has(id));
  if (incompletePlans.length > 0) errors.push(`Plans without summaries: ${incompletePlans.join(', ')}`);

  const orphanSummaries = [...summaryIds].filter(id => !planIds.has(id));
  if (orphanSummaries.length > 0) warnings.push(`Summaries without plans: ${orphanSummaries.join(', ')}`);

  output({
    complete: errors.length === 0,
    phase: phaseInfo.phase_number,
    plan_count: plans.length,
    summary_count: summaries.length,
    incomplete_plans: incompletePlans,
    orphan_summaries: orphanSummaries,
    errors,
    warnings,
  }, raw, errors.length === 0 ? 'complete' : 'incomplete');
}

// ─── Phase Operations ────────────────────────────────────────────────────────

function cmdPhaseAdd(cwd, description, raw) {
  if (!description) error('description required for phase add');
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) error('ROADMAP.md not found');

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const slug = generateSlugInternal(description);

  const phasePattern = /###\s*Phase\s+(\d+)(?:\.\d+)?:/gi;
  let maxPhase = 0;
  let m;
  while ((m = phasePattern.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    if (num > maxPhase) maxPhase = num;
  }

  const newPhaseNum = maxPhase + 1;
  const paddedNum = String(newPhaseNum).padStart(2, '0');
  const dirName = `${paddedNum}-${slug}`;
  const dirPath = path.join(cwd, '.planning', 'phases', dirName);
  fs.mkdirSync(dirPath, { recursive: true });

  const phaseEntry = `\n### Phase ${newPhaseNum}: ${description}\n\n**Goal:** [To be planned]\n**Depends on:** Phase ${maxPhase}\n**Contracts:** TBD\n**Plans:** 0 plans\n\nPlans:\n- [ ] TBD (run /bwb:plan ${newPhaseNum} to break down)\n`;

  let updatedContent;
  const lastSeparator = content.lastIndexOf('\n---');
  if (lastSeparator > 0) {
    updatedContent = content.slice(0, lastSeparator) + phaseEntry + content.slice(lastSeparator);
  } else {
    updatedContent = content + phaseEntry;
  }

  fs.writeFileSync(roadmapPath, updatedContent, 'utf-8');
  output({ phase_number: newPhaseNum, padded: paddedNum, name: description, slug, directory: `.planning/phases/${dirName}` }, raw, paddedNum);
}

function cmdPhaseComplete(cwd, phaseNum, raw) {
  if (!phaseNum) error('phase number required for phase complete');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const today = new Date().toISOString().split('T')[0];
  const phaseInfo = findPhaseInternal(cwd, phaseNum);
  if (!phaseInfo) error(`Phase ${phaseNum} not found`);

  const planCount = phaseInfo.plans.length;
  const summaryCount = phaseInfo.summaries.length;

  if (fs.existsSync(roadmapPath)) {
    let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    const checkboxPattern = new RegExp(`(-\\s*\\[)[ ](\\]\\s*.*Phase\\s+${phaseNum.replace('.', '\\.')}[:\\s][^\\n]*)`, 'i');
    roadmapContent = roadmapContent.replace(checkboxPattern, `$1x$2 (completed ${today})`);
    fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');
  }

  // Find next phase
  let nextPhaseNum = null;
  let nextPhaseName = null;
  let isLastPhase = true;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const currentFloat = parseFloat(phaseNum);
    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)?)-?(.*)/);
      if (dm) {
        const dirFloat = parseFloat(dm[1]);
        if (dirFloat > currentFloat) {
          nextPhaseNum = dm[1];
          nextPhaseName = dm[2] || null;
          isLastPhase = false;
          break;
        }
      }
    }
  } catch {}

  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');
    stateContent = stateContent.replace(/(\*\*Current Phase:\*\*\s*).*/, `$1${nextPhaseNum || phaseNum}`);
    if (nextPhaseName) {
      stateContent = stateContent.replace(/(\*\*Current Phase Name:\*\*\s*).*/, `$1${nextPhaseName.replace(/-/g, ' ')}`);
    }
    stateContent = stateContent.replace(/(\*\*Status:\*\*\s*).*/, `$1${isLastPhase ? 'Project complete' : 'Ready to research'}`);
    stateContent = stateContent.replace(/(\*\*Step:\*\*\s*).*/, `$1${isLastPhase ? 'complete' : 'research'}`);
    stateContent = stateContent.replace(/(\*\*Current Plan:\*\*\s*).*/, '$1Not started');
    stateContent = stateContent.replace(/(\*\*Last Activity:\*\*\s*).*/, `$1${today}`);
    fs.writeFileSync(statePath, stateContent, 'utf-8');
  }

  output({
    completed_phase: phaseNum,
    phase_name: phaseInfo.phase_name,
    plans_executed: `${summaryCount}/${planCount}`,
    next_phase: nextPhaseNum,
    next_phase_name: nextPhaseName,
    is_last_phase: isLastPhase,
    date: today,
  }, raw);
}

// ─── Plan Index + Summary Extract ────────────────────────────────────────────

function cmdPhasePlanIndex(cwd, phase, raw) {
  if (!phase) error('phase required for phase-plan-index');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  let phaseDir = null;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    const unpadded = normalized.replace(/^0+(\d)/, '$1');
    const match = dirs.find(d => d.startsWith(normalized + '-') || d.startsWith(unpadded + '-') || d === normalized || d === unpadded);
    if (match) phaseDir = path.join(phasesDir, match);
  } catch {}

  if (!phaseDir) {
    output({ phase: normalized, error: 'Phase not found', plans: [], waves: {}, incomplete: [] }, raw);
    return;
  }

  const phaseFiles = fs.readdirSync(phaseDir);
  const planFiles = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
  const summaryFiles = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

  const completedPlanIds = new Set(summaryFiles.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', '')));

  const plans = [];
  const waves = {};
  const incomplete = [];

  for (const planFile of planFiles) {
    const planId = planFile.replace('-PLAN.md', '').replace('PLAN.md', '');
    const content = fs.readFileSync(path.join(phaseDir, planFile), 'utf-8');
    const fm = extractFrontmatter(content);

    const taskMatches = content.match(/##\s*Task\s*\d+/gi) || [];
    const wave = parseInt(fm.wave, 10) || 1;
    let autonomous = true;
    if (fm.autonomous !== undefined) autonomous = fm.autonomous === 'true' || fm.autonomous === true;

    let filesModified = [];
    if (fm['files-modified']) filesModified = Array.isArray(fm['files-modified']) ? fm['files-modified'] : [fm['files-modified']];

    const contracts = Array.isArray(fm.contracts) ? fm.contracts : (fm.contracts ? [fm.contracts] : []);
    const hasSummary = completedPlanIds.has(planId);
    if (!hasSummary) incomplete.push(planId);

    plans.push({
      id: planId, wave, autonomous, objective: fm.objective || null,
      files_modified: filesModified, task_count: taskMatches.length,
      contracts, has_summary: hasSummary,
    });

    const waveKey = String(wave);
    if (!waves[waveKey]) waves[waveKey] = [];
    waves[waveKey].push(planId);
  }

  output({ phase: normalized, plans, waves, incomplete }, raw);
}

function cmdSummaryExtract(cwd, summaryPath, fields, raw) {
  if (!summaryPath) error('summary-path required');
  const fullPath = path.join(cwd, summaryPath);
  if (!fs.existsSync(fullPath)) { output({ error: 'File not found', path: summaryPath }, raw); return; }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);

  const fullResult = {
    path: summaryPath,
    one_liner: fm['one-liner'] || null,
    key_files: fm['key-files'] || [],
    tech_added: (fm['tech-stack'] && fm['tech-stack'].added) || [],
    patterns: fm['patterns-established'] || [],
    contracts_addressed: fm['contracts_addressed'] || [],
    type: fm.type || 'execute',
    decisions: (fm['key-decisions'] || []).map(d => {
      const idx = d.indexOf(':');
      return idx > 0 ? { summary: d.substring(0, idx).trim(), rationale: d.substring(idx + 1).trim() } : { summary: d, rationale: null };
    }),
  };

  if (fields && fields.length > 0) {
    const filtered = { path: summaryPath };
    for (const field of fields) {
      if (fullResult[field] !== undefined) filtered[field] = fullResult[field];
    }
    output(filtered, raw);
    return;
  }

  output(fullResult, raw);
}

// ─── Contracts Operations ────────────────────────────────────────────────────

function cmdContractsAnalyze(cwd, phase, raw) {
  const phaseInfo = phase ? findPhaseInternal(cwd, phase) : null;
  let contractsPath = null;

  if (phaseInfo) {
    const phaseDir = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDir);
      const contractsFile = files.find(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
      if (contractsFile) contractsPath = path.join(phaseDir, contractsFile);
    } catch {}
  }

  if (!contractsPath) {
    output({ error: 'CONTRACTS.md not found', phase: phase || null, features: [], count: 0 }, raw);
    return;
  }

  const content = fs.readFileSync(contractsPath, 'utf-8');
  const features = [];

  // Parse FEAT-{N} entries
  const featPattern = /###\s*(FEAT-\d+)\s*:\s*([^\n]+)/gi;
  let featMatch;

  while ((featMatch = featPattern.exec(content)) !== null) {
    const featId = featMatch[1];
    const featName = featMatch[2].trim();
    const featStart = featMatch.index;
    const restContent = content.slice(featStart);
    const nextFeat = restContent.match(/\n###\s*FEAT-\d+/);
    const featEnd = nextFeat ? featStart + nextFeat.index : content.length;
    const featSection = content.slice(featStart, featEnd);

    const whatMatch = featSection.match(/\*\*What:\*\*\s*([^\n]+)/i);
    const expectedMatch = featSection.match(/\*\*Expected:\*\*\s*([^\n]+)/i);
    const sourceMatch = featSection.match(/\*\*Source:\*\*\s*([^\n]+)/i);
    const dependsMatch = featSection.match(/\*\*Depends:\*\*\s*([^\n]+)/i);

    // Extract acceptance criteria (list items after **Acceptance:**)
    const acceptance = [];
    const acceptanceMatch = featSection.match(/\*\*Acceptance:\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n###|$)/i);
    if (acceptanceMatch) {
      const items = acceptanceMatch[1].match(/^-\s+(.+)$/gm) || [];
      items.forEach(item => acceptance.push(item.replace(/^-\s+/, '').trim()));
    }

    features.push({
      id: featId,
      name: featName,
      what: whatMatch ? whatMatch[1].trim() : null,
      expected: expectedMatch ? expectedMatch[1].trim() : null,
      acceptance,
      source: sourceMatch ? sourceMatch[1].trim() : null,
      depends: dependsMatch ? dependsMatch[1].trim() : null,
    });
  }

  output({ path: contractsPath, phase: phase || null, features, count: features.length }, raw);
}

function cmdValidationStatus(cwd, phase, raw) {
  const phaseInfo = phase ? findPhaseInternal(cwd, phase) : null;
  let validationPath = null;

  if (phaseInfo) {
    const phaseDir = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDir);
      const validationFile = files.find(f => f.endsWith('-VALIDATION.md') || f === 'VALIDATION.md');
      if (validationFile) validationPath = path.join(phaseDir, validationFile);
    } catch {}
  }

  if (!validationPath) {
    output({ error: 'VALIDATION.md not found', phase: phase || null, features: [], gaps: [], summary: null }, raw);
    return;
  }

  const content = fs.readFileSync(validationPath, 'utf-8');
  const features = [];
  const gaps = [];

  // Parse per-FEAT validation table rows: | FEAT-01 | ... | PASS/FAIL | ... |
  const tableRowPattern = /\|\s*(FEAT-\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/gi;
  let rowMatch;
  while ((rowMatch = tableRowPattern.exec(content)) !== null) {
    const featId = rowMatch[1].trim();
    const levels = {
      L1: rowMatch[2].trim(),
      L2: rowMatch[3].trim(),
      L3: rowMatch[4].trim(),
      L4: rowMatch[5].trim(),
      L5: rowMatch[6].trim(),
      L6: rowMatch[7].trim(),
    };

    const passed = Object.values(levels).every(v => v.toUpperCase() === 'PASS' || v === '-' || v === 'N/A');
    features.push({ id: featId, levels, passed });
  }

  // Parse GAP entries
  const gapPattern = /###\s*(GAP-\d+)\s*:?\s*([^\n]*)/gi;
  let gapMatch;
  while ((gapMatch = gapPattern.exec(content)) !== null) {
    const gapId = gapMatch[1];
    const gapDesc = gapMatch[2].trim();
    const gapStart = gapMatch.index;
    const restContent = content.slice(gapStart);
    const nextGap = restContent.match(/\n###\s*GAP-\d+/);
    const gapEnd = nextGap ? gapStart + nextGap.index : content.length;
    const gapSection = content.slice(gapStart, gapEnd);

    const contractMatch = gapSection.match(/\*\*Contract:\*\*\s*([^\n]+)/i);
    const levelMatch = gapSection.match(/\*\*Failed Level:\*\*\s*([^\n]+)/i);
    const fixMatch = gapSection.match(/\*\*Proposed Fix:\*\*\s*([^\n]+)/i);

    gaps.push({
      id: gapId,
      description: gapDesc,
      contract: contractMatch ? contractMatch[1].trim() : null,
      failed_level: levelMatch ? levelMatch[1].trim() : null,
      proposed_fix: fixMatch ? fixMatch[1].trim() : null,
    });
  }

  const passedCount = features.filter(f => f.passed).length;
  output({
    path: validationPath,
    phase: phase || null,
    features,
    gaps,
    summary: {
      total: features.length,
      passed: passedCount,
      failed: features.length - passedCount,
      gap_count: gaps.length,
      all_passed: passedCount === features.length && features.length > 0,
    },
  }, raw);
}

// ─── Compound Commands (Init) ────────────────────────────────────────────────

function cmdInitNewProject(cwd, raw) {
  const config = loadConfig(cwd);

  let hasCode = false;
  let hasPackageFile = false;
  try {
    const files = execSync('find . -maxdepth 3 \\( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.swift" -o -name "*.java" \\) 2>/dev/null | grep -v node_modules | grep -v .git | head -5', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    hasCode = files.trim().length > 0;
  } catch {}

  hasPackageFile = pathExistsInternal(cwd, 'package.json') ||
    pathExistsInternal(cwd, 'requirements.txt') ||
    pathExistsInternal(cwd, 'Cargo.toml') ||
    pathExistsInternal(cwd, 'go.mod') ||
    pathExistsInternal(cwd, 'Package.swift');

  output({
    researcher_model: resolveModelInternal(cwd, 'bwb-researcher'),
    roadmapper_model: resolveModelInternal(cwd, 'bwb-roadmapper'),
    commit_docs: config.commit_docs,
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
    has_existing_code: hasCode,
    has_package_file: hasPackageFile,
    is_brownfield: hasCode || hasPackageFile,
    has_git: pathExistsInternal(cwd, '.git'),
  }, raw);
}

function cmdInitPlanPhase(cwd, phase, includes, raw) {
  if (!phase) error('phase required for init plan-phase');
  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result = {
    planner_model: resolveModelInternal(cwd, 'bwb-planner'),
    builder_model: resolveModelInternal(cwd, 'bwb-builder'),
    commit_docs: config.commit_docs,

    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,

    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_contracts: phaseInfo?.has_contracts || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    plan_count: phaseInfo?.plans?.length || 0,

    planning_exists: pathExistsInternal(cwd, '.planning'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
  };

  if (includes.has('state')) result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));
  if (includes.has('roadmap')) result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));

  if (includes.has('context') && phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) result.context_content = safeReadFile(path.join(phaseDirFull, contextFile));
    } catch {}
  }
  if (includes.has('research') && phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) result.research_content = safeReadFile(path.join(phaseDirFull, researchFile));
    } catch {}
  }
  if (includes.has('contracts') && phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contractsFile = files.find(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
      if (contractsFile) result.contracts_content = safeReadFile(path.join(phaseDirFull, contractsFile));
    } catch {}
  }
  if (includes.has('validation') && phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const validationFile = files.find(f => f.endsWith('-VALIDATION.md') || f === 'VALIDATION.md');
      if (validationFile) result.validation_content = safeReadFile(path.join(phaseDirFull, validationFile));
    } catch {}
  }

  output(result, raw);
}

function cmdInitExecutePhase(cwd, phase, includes, raw) {
  if (!phase) error('phase required for init execute-phase');
  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result = {
    builder_model: resolveModelInternal(cwd, 'bwb-builder'),
    validator_model: resolveModelInternal(cwd, 'bwb-validator'),
    commit_docs: config.commit_docs,

    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,

    plans: phaseInfo?.plans || [],
    summaries: phaseInfo?.summaries || [],
    incomplete_plans: phaseInfo?.incomplete_plans || [],
    plan_count: phaseInfo?.plans?.length || 0,
    incomplete_count: phaseInfo?.incomplete_plans?.length || 0,

    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    config_exists: pathExistsInternal(cwd, '.planning/config.json'),
  };

  if (includes.has('state')) result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));
  if (includes.has('roadmap')) result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));
  if (includes.has('config')) result.config_content = safeReadFile(path.join(cwd, '.planning', 'config.json'));

  output(result, raw);
}

function cmdInitContracts(cwd, phase, includes, raw) {
  if (!phase) error('phase required for init contracts');
  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result = {
    commit_docs: config.commit_docs,

    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,

    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_contracts: phaseInfo?.has_contracts || false,

    planning_exists: pathExistsInternal(cwd, '.planning'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
  };

  if (includes.has('roadmap')) result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));
  if (includes.has('state')) result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));

  if (phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) result.context_content = safeReadFile(path.join(phaseDirFull, contextFile));
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) result.research_content = safeReadFile(path.join(phaseDirFull, researchFile));
    } catch {}
  }

  output(result, raw);
}

function cmdInitValidate(cwd, phase, includes, raw) {
  if (!phase) error('phase required for init validate');
  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const result = {
    validator_model: resolveModelInternal(cwd, 'bwb-validator'),
    fixer_model: resolveModelInternal(cwd, 'bwb-fixer'),
    commit_docs: config.commit_docs,

    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,

    has_contracts: phaseInfo?.has_contracts || false,
    has_validation: phaseInfo?.has_validation || false,
    plan_count: phaseInfo?.plans?.length || 0,
    summary_count: phaseInfo?.summaries?.length || 0,

    planning_exists: pathExistsInternal(cwd, '.planning'),
  };

  if (phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contractsFile = files.find(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
      if (contractsFile) result.contracts_content = safeReadFile(path.join(phaseDirFull, contractsFile));
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) result.context_content = safeReadFile(path.join(phaseDirFull, contextFile));
      const validationFile = files.find(f => f.endsWith('-VALIDATION.md') || f === 'VALIDATION.md');
      if (validationFile) result.validation_content = safeReadFile(path.join(phaseDirFull, validationFile));

      // Collect all summaries content for validator
      const summaryFiles = files.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      if (summaryFiles.length > 0) {
        result.summaries_content = summaryFiles.map(f => safeReadFile(path.join(phaseDirFull, f))).filter(Boolean).join('\n---\n');
      }

      // Load preparation content if exists (from /bwb:prepare)
      const preparationFile = files.find(f => f.endsWith('-PREPARATION.md') || f === 'PREPARATION.md');
      if (preparationFile) result.preparation_content = safeReadFile(path.join(phaseDirFull, preparationFile));
    } catch {}
  }

  output(result, raw);
}

function cmdInitBrownfield(cwd, raw) {
  const config = loadConfig(cwd);

  // Detect project type
  const detections = {};
  const packageFiles = {
    'package.json': 'node',
    'requirements.txt': 'python',
    'Pipfile': 'python',
    'pyproject.toml': 'python',
    'Cargo.toml': 'rust',
    'go.mod': 'go',
    'Package.swift': 'swift',
    'build.gradle': 'java',
    'pom.xml': 'java',
    'Gemfile': 'ruby',
    'composer.json': 'php',
  };

  const detected_types = [];
  for (const [file, type] of Object.entries(packageFiles)) {
    if (pathExistsInternal(cwd, file)) {
      detected_types.push(type);
      detections[file] = true;
    }
  }

  // Detect frameworks from package.json
  let frameworks = [];
  let projectName = null;
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      projectName = pkg.name || null;
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const frameworkMap = {
        'react': 'React', 'next': 'Next.js', 'vue': 'Vue', 'nuxt': 'Nuxt',
        'angular': 'Angular', 'svelte': 'Svelte', 'express': 'Express',
        'fastify': 'Fastify', 'react-native': 'React Native', 'expo': 'Expo',
        'electron': 'Electron', 'tailwindcss': 'Tailwind CSS',
      };
      for (const [dep, name] of Object.entries(frameworkMap)) {
        if (allDeps[dep]) frameworks.push(name);
      }
    } catch {}
  }

  // Count source files
  let sourceFileCount = 0;
  try {
    const result = execSync('find . -maxdepth 5 \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.swift" -o -name "*.java" \\) 2>/dev/null | grep -v node_modules | grep -v .git | grep -v dist | grep -v build | wc -l', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    sourceFileCount = parseInt(result.trim(), 10) || 0;
  } catch {}

  // Detect key directories
  const keyDirs = [];
  for (const dir of ['src', 'lib', 'app', 'pages', 'components', 'api', 'server', 'client', 'test', 'tests', '__tests__']) {
    if (pathExistsInternal(cwd, dir)) keyDirs.push(dir);
  }

  output({
    commit_docs: config.commit_docs,
    project_name: projectName,
    detected_types,
    frameworks,
    detections,
    source_file_count: sourceFileCount,
    key_directories: keyDirs,
    has_git: pathExistsInternal(cwd, '.git'),
    has_readme: pathExistsInternal(cwd, 'README.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
  }, raw);
}

function cmdInitBaseline(cwd, raw) {
  const config = loadConfig(cwd);
  const planningExists = pathExistsInternal(cwd, '.planning');
  const hasPhase00 = pathExistsInternal(cwd, '.planning/phases/00-baseline');

  // Reuse brownfield detection for project info
  const packageFiles = {
    'package.json': 'node',
    'requirements.txt': 'python',
    'Pipfile': 'python',
    'pyproject.toml': 'python',
    'Cargo.toml': 'rust',
    'go.mod': 'go',
    'Package.swift': 'swift',
    'build.gradle': 'java',
    'pom.xml': 'java',
    'Gemfile': 'ruby',
    'composer.json': 'php',
  };

  const detected_types = [];
  for (const [file, type] of Object.entries(packageFiles)) {
    if (pathExistsInternal(cwd, file)) {
      detected_types.push(type);
    }
  }

  // Get project name
  let projectName = path.basename(cwd);
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) projectName = pkg.name;
    } catch {}
  }

  // Count source files
  let sourceFileCount = 0;
  try {
    const result = execSync('find . -maxdepth 5 \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.swift" -o -name "*.java" \\) 2>/dev/null | grep -v node_modules | grep -v .git | grep -v dist | grep -v build | wc -l', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    sourceFileCount = parseInt(result.trim(), 10) || 0;
  } catch {}

  // Group source files by top-level directory into areas
  const areas = [];
  const srcDirs = ['src', 'lib', 'app', 'pages', 'components', 'api', 'server', 'client', 'routes', 'handlers', 'services', 'modules', 'features'];
  const foundDirs = [];

  for (const dir of srcDirs) {
    if (pathExistsInternal(cwd, dir)) foundDirs.push(dir);
  }

  // If 'src' exists, also check its subdirectories
  if (pathExistsInternal(cwd, 'src')) {
    try {
      const srcEntries = fs.readdirSync(path.join(cwd, 'src'), { withFileTypes: true });
      for (const entry of srcEntries) {
        if (entry.isDirectory() && !['__tests__', '__mocks__', 'test', 'tests', 'types', 'utils', 'helpers', 'config', 'styles', 'assets'].includes(entry.name)) {
          const subPath = path.join('src', entry.name);
          // Count files in this subdirectory
          try {
            const count = execSync(`find ${subPath} -maxdepth 3 \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \\) 2>/dev/null | grep -v node_modules | wc -l`, {
              cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
            });
            const fileCount = parseInt(count.trim(), 10) || 0;
            if (fileCount >= 2) {
              // Capitalize first letter for display name
              const displayName = entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
              areas.push({ name: displayName, path: subPath, files: fileCount });
            }
          } catch {}
        }
      }
    } catch {}
  }

  // If no src subdirectories found, use top-level dirs as areas
  if (areas.length === 0) {
    for (const dir of foundDirs) {
      try {
        const count = execSync(`find ${dir} -maxdepth 3 \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \\) 2>/dev/null | grep -v node_modules | wc -l`, {
          cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
        });
        const fileCount = parseInt(count.trim(), 10) || 0;
        if (fileCount >= 2) {
          const displayName = dir.charAt(0).toUpperCase() + dir.slice(1);
          areas.push({ name: displayName, path: dir, files: fileCount });
        }
      } catch {}
    }
  }

  // Sort by file count descending
  areas.sort((a, b) => b.files - a.files);

  output({
    areas,
    has_phase_00: hasPhase00,
    project_name: projectName,
    detected_types,
    source_file_count: sourceFileCount,
    commit_docs: config.commit_docs,
    planning_exists: planningExists,
  }, raw);
}

function cmdInitQuick(cwd, description, raw) {
  const config = loadConfig(cwd);
  const now = new Date();
  const slug = description ? generateSlugInternal(description)?.substring(0, 40) : null;

  const quickDir = path.join(cwd, '.planning', 'quick');
  let nextNum = 1;
  try {
    const existing = fs.readdirSync(quickDir)
      .filter(f => /^\d+-/.test(f))
      .map(f => parseInt(f.split('-')[0], 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) nextNum = Math.max(...existing) + 1;
  } catch {}

  output({
    planner_model: resolveModelInternal(cwd, 'bwb-planner'),
    builder_model: resolveModelInternal(cwd, 'bwb-builder'),
    validator_model: resolveModelInternal(cwd, 'bwb-validator'),
    commit_docs: config.commit_docs,
    next_num: nextNum,
    slug,
    description: description || null,
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),
    quick_dir: '.planning/quick',
    task_dir: slug ? `.planning/quick/${nextNum}-${slug}` : null,
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
  }, raw);
}

function cmdInitResume(cwd, raw) {
  const config = loadConfig(cwd);

  let interruptedAgentId = null;
  try {
    interruptedAgentId = fs.readFileSync(path.join(cwd, '.planning', 'current-agent-id.txt'), 'utf-8').trim();
  } catch {}

  output({
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
    has_interrupted_agent: !!interruptedAgentId,
    interrupted_agent_id: interruptedAgentId,
    commit_docs: config.commit_docs,
  }, raw);
}

function cmdInitProgress(cwd, includes, raw) {
  const config = loadConfig(cwd);
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const phases = [];
  let currentPhase = null;
  let nextPhase = null;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      const match = dir.match(/^(\d+(?:\.\d+)?)-?(.*)/);
      const phaseNumber = match ? match[1] : dir;
      const phaseName = match && match[2] ? match[2] : null;
      const phasePath = path.join(phasesDir, dir);
      const phaseFiles = fs.readdirSync(phasePath);

      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      const hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      const hasContracts = phaseFiles.some(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
      const hasValidation = phaseFiles.some(f => f.endsWith('-VALIDATION.md') || f === 'VALIDATION.md');
      const hasPreparation = phaseFiles.some(f => f.endsWith('-PREPARATION.md') || f === 'PREPARATION.md');

      // Determine BWB step
      let step = 'pending';
      if (hasValidation) step = 'complete';
      else if (hasPreparation && plans.length > 0 && summaries.length > 0 && summaries.length >= plans.length) step = 'validate';
      else if (plans.length > 0 && summaries.length > 0 && summaries.length >= plans.length) step = 'prepare';
      else if (plans.length > 0 && summaries.length > 0) step = 'build';
      else if (plans.length > 0) step = 'build';
      else if (hasContracts) step = 'plan';
      else if (hasContext) step = 'contracts';
      else if (hasResearch) step = 'discuss';
      else step = 'research';

      const phaseInfo = {
        number: phaseNumber, name: phaseName,
        directory: path.join('.planning', 'phases', dir),
        step,
        plan_count: plans.length, summary_count: summaries.length,
        has_research: hasResearch, has_context: hasContext,
        has_contracts: hasContracts, has_validation: hasValidation,
        has_preparation: hasPreparation,
      };

      phases.push(phaseInfo);

      if (!currentPhase && !['complete', 'validate'].includes(step)) {
        currentPhase = phaseInfo;
      }
      if (!nextPhase && step === 'research') {
        nextPhase = phaseInfo;
      }
    }
  } catch {}

  const result = {
    builder_model: resolveModelInternal(cwd, 'bwb-builder'),
    planner_model: resolveModelInternal(cwd, 'bwb-planner'),
    commit_docs: config.commit_docs,
    phases,
    phase_count: phases.length,
    completed_count: phases.filter(p => p.step === 'complete').length,
    current_phase: currentPhase,
    next_phase: nextPhase,
    has_work_in_progress: !!currentPhase,
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
  };

  if (includes.has('state')) result.state_content = safeReadFile(path.join(cwd, '.planning', 'STATE.md'));
  if (includes.has('roadmap')) result.roadmap_content = safeReadFile(path.join(cwd, '.planning', 'ROADMAP.md'));
  if (includes.has('project')) result.project_content = safeReadFile(path.join(cwd, '.planning', 'PROJECT.md'));

  output(result, raw);
}

function cmdInitPrepare(cwd, phase, includes, raw) {
  if (!phase) error('phase required for init prepare');
  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  // Detect project type
  const packageFiles = {
    'package.json': 'node',
    'requirements.txt': 'python',
    'Pipfile': 'python',
    'pyproject.toml': 'python',
    'Cargo.toml': 'rust',
    'go.mod': 'go',
    'Gemfile': 'ruby',
    'composer.json': 'php',
  };
  const detected_types = [];
  for (const [file, type] of Object.entries(packageFiles)) {
    if (pathExistsInternal(cwd, file)) detected_types.push(type);
  }

  const result = {
    preparer_model: resolveModelInternal(cwd, 'bwb-preparer'),
    commit_docs: config.commit_docs,

    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,

    has_contracts: phaseInfo?.has_contracts || false,
    has_summaries: (phaseInfo?.summaries?.length || 0) > 0,
    has_preparation: phaseInfo?.has_preparation || false,
    has_validation: phaseInfo?.has_validation || false,
    plan_count: phaseInfo?.plans?.length || 0,
    summary_count: phaseInfo?.summaries?.length || 0,

    detected_types: [...new Set(detected_types)],
    has_env: pathExistsInternal(cwd, '.env'),
    has_env_example: pathExistsInternal(cwd, '.env.example'),
    has_test_dir: pathExistsInternal(cwd, 'test') || pathExistsInternal(cwd, 'tests') || pathExistsInternal(cwd, '__tests__'),

    planning_exists: pathExistsInternal(cwd, '.planning'),
  };

  if (phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contractsFile = files.find(f => f.endsWith('-CONTRACTS.md') || f === 'CONTRACTS.md');
      if (contractsFile) result.contracts_content = safeReadFile(path.join(phaseDirFull, contractsFile));

      const summaryFiles = files.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      if (summaryFiles.length > 0) {
        result.summaries_content = summaryFiles.map(f => safeReadFile(path.join(phaseDirFull, f))).filter(Boolean).join('\n---\n');
      }

      const preparationFile = files.find(f => f.endsWith('-PREPARATION.md') || f === 'PREPARATION.md');
      if (preparationFile) result.preparation_content = safeReadFile(path.join(phaseDirFull, preparationFile));
    } catch {}
  }

  output(result, raw);
}

function cmdInitPhaseOp(cwd, phase, raw) {
  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  output({
    commit_docs: config.commit_docs,
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_contracts: phaseInfo?.has_contracts || false,
    has_validation: phaseInfo?.has_validation || false,
    has_preparation: phaseInfo?.has_preparation || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    plan_count: phaseInfo?.plans?.length || 0,
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
    fix_max_iterations: config.fix_max_iterations,
    fix_auto_retry: config.fix_auto_retry,
  }, raw);
}

// ─── CLI Router ───────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];
  const cwd = process.cwd();

  if (!command) {
    error('Usage: bwb <command> [args] [--raw]\nCommands: state, resolve-model, find-phase, commit, frontmatter, verify, contracts, validation, generate-slug, current-timestamp, verify-path-exists, config-ensure-section, config-set, history-digest, phase-plan-index, state-snapshot, summary-extract, roadmap, phase, phases, init');
  }

  switch (command) {
    case 'state': {
      const sub = args[1];
      if (sub === 'update') {
        cmdStateUpdate(cwd, args[2], args[3]);
      } else if (sub === 'get') {
        cmdStateGet(cwd, args[2], raw);
      } else if (sub === 'patch') {
        const patches = {};
        for (let i = 2; i < args.length; i += 2) {
          const key = args[i].replace(/^--/, '');
          const value = args[i + 1];
          if (key && value !== undefined) patches[key] = value;
        }
        cmdStatePatch(cwd, patches, raw);
      } else if (sub === 'advance-plan') {
        cmdStateAdvancePlan(cwd, raw);
      } else if (sub === 'record-metric') {
        const pi = args.indexOf('--phase'), pli = args.indexOf('--plan'), di = args.indexOf('--duration');
        const ti = args.indexOf('--tasks'), fi = args.indexOf('--files');
        cmdStateRecordMetric(cwd, {
          phase: pi !== -1 ? args[pi + 1] : null,
          plan: pli !== -1 ? args[pli + 1] : null,
          duration: di !== -1 ? args[di + 1] : null,
          tasks: ti !== -1 ? args[ti + 1] : null,
          files: fi !== -1 ? args[fi + 1] : null,
        }, raw);
      } else if (sub === 'update-progress') {
        cmdStateUpdateProgress(cwd, raw);
      } else if (sub === 'add-decision') {
        const pi = args.indexOf('--phase'), si = args.indexOf('--summary'), ri = args.indexOf('--rationale');
        cmdStateAddDecision(cwd, {
          phase: pi !== -1 ? args[pi + 1] : null,
          summary: si !== -1 ? args[si + 1] : null,
          rationale: ri !== -1 ? args[ri + 1] : '',
        }, raw);
      } else if (sub === 'add-blocker') {
        const ti = args.indexOf('--text');
        cmdStateAddBlocker(cwd, ti !== -1 ? args[ti + 1] : null, raw);
      } else if (sub === 'resolve-blocker') {
        const ti = args.indexOf('--text');
        cmdStateResolveBlocker(cwd, ti !== -1 ? args[ti + 1] : null, raw);
      } else if (sub === 'record-session') {
        const si = args.indexOf('--stopped-at'), ri = args.indexOf('--resume-file');
        cmdStateRecordSession(cwd, {
          stopped_at: si !== -1 ? args[si + 1] : null,
          resume_file: ri !== -1 ? args[ri + 1] : 'None',
        }, raw);
      } else {
        cmdStateLoad(cwd, raw);
      }
      break;
    }

    case 'resolve-model':
      cmdResolveModel(cwd, args[1], raw);
      break;

    case 'find-phase':
      cmdFindPhase(cwd, args[1], raw);
      break;

    case 'commit': {
      const amend = args.includes('--amend');
      const message = args[1];
      const filesIndex = args.indexOf('--files');
      const files = filesIndex !== -1 ? args.slice(filesIndex + 1).filter(a => !a.startsWith('--')) : [];
      cmdCommit(cwd, message, files, raw, amend);
      break;
    }

    case 'frontmatter': {
      const sub = args[1];
      const file = args[2];
      if (sub === 'get') {
        const fi = args.indexOf('--field');
        cmdFrontmatterGet(cwd, file, fi !== -1 ? args[fi + 1] : null, raw);
      } else if (sub === 'set') {
        const fi = args.indexOf('--field'), vi = args.indexOf('--value');
        cmdFrontmatterSet(cwd, file, fi !== -1 ? args[fi + 1] : null, vi !== -1 ? args[vi + 1] : undefined, raw);
      } else if (sub === 'merge') {
        const di = args.indexOf('--data');
        cmdFrontmatterMerge(cwd, file, di !== -1 ? args[di + 1] : null, raw);
      } else if (sub === 'validate') {
        const si = args.indexOf('--schema');
        cmdFrontmatterValidate(cwd, file, si !== -1 ? args[si + 1] : null, raw);
      } else {
        error('Unknown frontmatter subcommand. Available: get, set, merge, validate');
      }
      break;
    }

    case 'verify': {
      const sub = args[1];
      if (sub === 'plan-structure') {
        cmdVerifyPlanStructure(cwd, args[2], raw);
      } else if (sub === 'phase-completeness') {
        cmdVerifyPhaseCompleteness(cwd, args[2], raw);
      } else {
        error('Unknown verify subcommand. Available: plan-structure, phase-completeness');
      }
      break;
    }

    case 'contracts': {
      const sub = args[1];
      if (sub === 'analyze') {
        const pi = args.indexOf('--phase');
        cmdContractsAnalyze(cwd, pi !== -1 ? args[pi + 1] : null, raw);
      } else {
        error('Unknown contracts subcommand. Available: analyze');
      }
      break;
    }

    case 'validation': {
      const sub = args[1];
      if (sub === 'status') {
        const pi = args.indexOf('--phase');
        cmdValidationStatus(cwd, pi !== -1 ? args[pi + 1] : null, raw);
      } else {
        error('Unknown validation subcommand. Available: status');
      }
      break;
    }

    case 'generate-slug':
      cmdGenerateSlug(args[1], raw);
      break;

    case 'current-timestamp':
      cmdCurrentTimestamp(args[1] || 'full', raw);
      break;

    case 'verify-path-exists':
      cmdVerifyPathExists(cwd, args[1], raw);
      break;

    case 'config-ensure-section':
      cmdConfigEnsureSection(cwd, raw);
      break;

    case 'config-set':
      cmdConfigSet(cwd, args[1], args[2], raw);
      break;

    case 'history-digest':
      cmdHistoryDigest(cwd, raw);
      break;

    case 'phases': {
      const sub = args[1];
      if (sub === 'list') {
        const ti = args.indexOf('--type'), pi = args.indexOf('--phase');
        cmdPhasesList(cwd, {
          type: ti !== -1 ? args[ti + 1] : null,
          phase: pi !== -1 ? args[pi + 1] : null,
        }, raw);
      } else {
        error('Unknown phases subcommand. Available: list');
      }
      break;
    }

    case 'roadmap': {
      const sub = args[1];
      if (sub === 'get-phase') cmdRoadmapGetPhase(cwd, args[2], raw);
      else if (sub === 'analyze') cmdRoadmapAnalyze(cwd, raw);
      else error('Unknown roadmap subcommand. Available: get-phase, analyze');
      break;
    }

    case 'phase': {
      const sub = args[1];
      if (sub === 'add') cmdPhaseAdd(cwd, args.slice(2).join(' '), raw);
      else if (sub === 'complete') cmdPhaseComplete(cwd, args[2], raw);
      else error('Unknown phase subcommand. Available: add, complete');
      break;
    }

    case 'phase-plan-index':
      cmdPhasePlanIndex(cwd, args[1], raw);
      break;

    case 'state-snapshot':
      cmdStateSnapshot(cwd, raw);
      break;

    case 'summary-extract': {
      const fieldsIndex = args.indexOf('--fields');
      const fields = fieldsIndex !== -1 ? args[fieldsIndex + 1].split(',') : null;
      cmdSummaryExtract(cwd, args[1], fields, raw);
      break;
    }

    case 'init': {
      const workflow = args[1];
      const includes = parseIncludeFlag(args);
      switch (workflow) {
        case 'new-project': cmdInitNewProject(cwd, raw); break;
        case 'plan-phase': cmdInitPlanPhase(cwd, args[2], includes, raw); break;
        case 'execute-phase': cmdInitExecutePhase(cwd, args[2], includes, raw); break;
        case 'contracts': cmdInitContracts(cwd, args[2], includes, raw); break;
        case 'validate': cmdInitValidate(cwd, args[2], includes, raw); break;
        case 'prepare': cmdInitPrepare(cwd, args[2], includes, raw); break;
        case 'brownfield': cmdInitBrownfield(cwd, raw); break;
        case 'baseline': cmdInitBaseline(cwd, raw); break;
        case 'quick': cmdInitQuick(cwd, args.slice(2).join(' '), raw); break;
        case 'resume': cmdInitResume(cwd, raw); break;
        case 'progress': cmdInitProgress(cwd, includes, raw); break;
        case 'phase-op': cmdInitPhaseOp(cwd, args[2], raw); break;
        default:
          error(`Unknown init workflow: ${workflow}\nAvailable: new-project, plan-phase, execute-phase, contracts, validate, prepare, brownfield, baseline, quick, resume, progress, phase-op`);
      }
      break;
    }

    default:
      error(`Unknown command: ${command}`);
  }
}

main();
