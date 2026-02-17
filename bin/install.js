#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Config ---

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const DEST = {
  bwb: path.join(CLAUDE_DIR, 'bwb'),
  agents: path.join(CLAUDE_DIR, 'agents'),
  commands: path.join(CLAUDE_DIR, 'commands', 'bwb'),
};

// Source paths — relative to package root (one level up from bin/)
const PKG_ROOT = path.resolve(__dirname, '..');
const SRC = {
  bwb: path.join(PKG_ROOT, 'bwb'),
  agents: path.join(PKG_ROOT, 'agents'),
  commands: path.join(PKG_ROOT, 'commands', 'bwb'),
};

// --- Helpers ---

function banner() {
  console.log('');
  console.log('  BWB — Build Without Bullshit');
  console.log('  Contract-driven development for Claude Code');
  console.log('');
}

function fatal(msg) {
  console.error(`  ERROR: ${msg}`);
  console.log('');
  process.exit(1);
}

function copyDirRecursive(src, dest) {
  let count = 0;
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      count += copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function readVersion(dir) {
  const versionFile = path.join(dir, 'VERSION');
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, 'utf8').trim();
  }
  return null;
}

// --- Main ---

function main() {
  banner();

  // 1. Check ~/.claude/ exists
  if (!fs.existsSync(CLAUDE_DIR)) {
    fatal(
      `${CLAUDE_DIR} not found.\n` +
      '  Install Claude Code first: https://docs.anthropic.com/en/docs/claude-code'
    );
  }

  // 2. Detect existing install
  const prevVersion = readVersion(DEST.bwb);
  const newVersion = readVersion(SRC.bwb);

  if (!newVersion) {
    fatal('VERSION file missing from package. This is a packaging bug.');
  }

  const isUpdate = prevVersion !== null;

  // 3. Copy bwb/ → ~/.claude/bwb/
  console.log('  Installing framework files...');
  const bwbCount = copyDirRecursive(SRC.bwb, DEST.bwb);

  // 4. Copy agents/bwb-*.md → ~/.claude/agents/ (only bwb-* files)
  fs.mkdirSync(DEST.agents, { recursive: true });
  let agentCount = 0;
  for (const file of fs.readdirSync(SRC.agents)) {
    if (file.startsWith('bwb-') && file.endsWith('.md')) {
      fs.copyFileSync(
        path.join(SRC.agents, file),
        path.join(DEST.agents, file)
      );
      agentCount++;
    }
  }

  // 5. Copy commands/bwb/ → ~/.claude/commands/bwb/
  const cmdCount = copyDirRecursive(SRC.commands, DEST.commands);

  // 6. Make CLI executable
  const cliPath = path.join(DEST.bwb, 'bin', 'bwb.js');
  if (fs.existsSync(cliPath)) {
    fs.chmodSync(cliPath, 0o755);
  }

  // 7. Summary
  console.log('');
  if (isUpdate) {
    if (prevVersion === newVersion) {
      console.log(`  Reinstalled BWB v${newVersion}`);
    } else {
      console.log(`  Updated BWB from v${prevVersion} to v${newVersion}`);
    }
  } else {
    console.log(`  Installed BWB v${newVersion}`);
  }

  console.log('');
  console.log(`  Files copied:`);
  console.log(`    bwb/        ${bwbCount} files → ~/.claude/bwb/`);
  console.log(`    agents/     ${agentCount} files → ~/.claude/agents/`);
  console.log(`    commands/   ${cmdCount} files → ~/.claude/commands/bwb/`);
  console.log('');
  console.log('  Ready. Open Claude Code in any project and run /bwb:new to start.');
  console.log('');
}

main();
