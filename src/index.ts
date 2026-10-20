#!/usr/bin/env node
import { Command } from 'commander';
import simpleGit from 'simple-git';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import { RegistryManager, slugify } from './registry';
import { Objective, Claim } from './types';
import { loadConfig } from './config';
import { runASTAudit } from './ast-verifier';
import { archiveObjective } from './archiver';
import { injectRules } from './rule-injector';

const program = new Command();
const cwd = process.cwd();
const registry = new RegistryManager(cwd);
const git = simpleGit(cwd);

program
  .name('shield')
  .description('Anti-Drift Shield: universal AI verification engine')
  .version(require('../package.json').version);

program
  .command('goal <objective>')
  .description('Set the active project objective')
  .option('--scope <dirs>', 'comma-separated allowed directories', '')
  .action(async (goal: string, opts: { scope: string }) => {
    try {
      const branch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      const startCommit = (await git.revparse(['HEAD'])).trim();
      const scope = opts.scope
        ? opts.scope.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      const baseId = slugify(goal);
      const reg = registry.load();
      let id = baseId;
      let counter = 1;
      while (reg.objectives[id]) id = `${baseId}-${counter++}`;

      const objective: Objective = {
        id,
        goal,
        startTime: new Date().toISOString(),
        branch,
        startCommit,
        scope,
        status: 'active',
        claims: [],
      };
      registry.addObjective(objective);

      console.log(`\x1b[32m[SHIELD: GOAL SET]\x1b[0m`);
      console.log(`  ID:     ${id}`);
      console.log(`  Goal:   ${goal}`);
      console.log(`  Start:  ${objective.startTime}`);
      console.log(`  Branch: ${branch}`);
      console.log(`  Commit: ${startCommit.slice(0, 7)}`);
      if (scope.length) console.log(`  Scope:  ${scope.join(', ')}`);
    } catch (err: any) {
      console.error(`\x1b[31m[SHIELD ERROR]\x1b[0m ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('claim <text>')
  .description('Register a claim the AI made (to be physically verified)')
  .action((text: string) => {
    const current = registry.getCurrent();
    if (!current) {
      console.log('\x1b[33m[SHIELD: NO ACTIVE GOAL]\x1b[0m');
      console.log('Run: shield goal "<objective>" first.');
      process.exit(1);
    }
    const claim: Claim = {
      id: `claim-${Date.now()}`,
      text,
      registeredAt: new Date().toISOString(),
      verified: null,
      lastVerifiedAt: null,
      details: '',
    };
    registry.addClaim(current.id, claim);
    console.log(`\x1b[32m[SHIELD: CLAIM REGISTERED]\x1b[0m`);
    console.log(`  Objective: ${current.id}`);
    console.log(`  Claim:     "${text}"`);
    console.log(`  Registered: ${claim.registeredAt}`);
  });

program
  .command('verify')
  .description('Audit for orphans, stubs, types, worktrees, deps, and claims')
  .action(() => {
    const current = registry.getCurrent();
    if (!current) {
      console.log('\x1b[33m[SHIELD: NO ACTIVE GOAL]\x1b[0m');
      console.log('Run: shield goal "<objective>" first.');
      process.exit(1);
    }

    const config = loadConfig(cwd);
    console.log(`\x1b[36m[SHIELD: VERIFYING]\x1b[0m`);
    console.log(`  Goal: ${current.goal}\n`);

    const result = runASTAudit(cwd, config, current);

    if (result.changedFiles.length > 0) {
      console.log(`  Files checked: ${result.changedFiles.length}`);
      for (const f of result.changedFiles) console.log(`    • ${f}`);
      console.log('');
    }

    let failed = false;

    if (result.orphans.length > 0) {
      failed = true;
      console.log('\x1b[31m[ORPHANED FILES — never imported anywhere]\x1b[0m');
      for (const f of result.orphans) console.log(`  ✗ ${f}`);
      console.log('');
    }

    if (result.stubs.length > 0) {
      failed = true;
      console.log('\x1b[31m[STUBS DETECTED — TODO / FIXME / Not-implemented]\x1b[0m');
      for (const f of result.stubs) console.log(`  ✗ ${f}`);
      console.log('');
    }

    if (!result.typeCheck.skipped && !result.typeCheck.passed) {
      failed = true;
      console.log('\x1b[31m[TYPE CHECK FAILED]\x1b[0m');
      console.log(result.typeCheck.errorOutput?.slice(0, 2000) || 'Unknown error');
      console.log('');
    }

    if (result.worktreeIssues.length > 0) {
      failed = true;
      console.log('\x1b[31m[WORKTREE ISSUES]\x1b[0m');
      for (const i of result.worktreeIssues) console.log(`  ✗ ${i.path}: ${i.issue}`);
      console.log('');
    }

    if (result.packageIssues.length > 0) {
      failed = true;
      console.log('\x1b[31m[PACKAGE / LOCKFILE CHANGES DETECTED]\x1b[0m');
      for (const i of result.packageIssues) console.log(`  ⚠ ${i.file}: ${i.message}`);
      console.log('');
    }

    if (result.claimResults.length > 0) {
      console.log('\x1b[36m[CLAIMS VERIFIED]\x1b[0m');
      for (const r of result.claimResults) {
        if (r.duplicate) {
          failed = true;
          console.log(`  \x1b[31m✗ REPEATED CLAIM\x1b[0m "${r.claim.text}"`);
          continue;
        }
        if (r.status === 'VERIFIED') {
          console.log(`  \x1b[32m✓ VERIFIED\x1b[0m "${r.claim.text}"`);
          console.log(`      → ${r.details}`);
        } else if (r.status === 'FALSE') {
          failed = true;
          console.log(`  \x1b[31m✗ FALSE\x1b[0m "${r.claim.text}"`);
          console.log(`      → ${r.details}`);
        } else {
          console.log(`  \x1b[33m? UNSUBSTANTIATED\x1b[0m "${r.claim.text}"`);
          console.log(`      → ${r.details}`);
        }
      }
      console.log('');
    }

    if (!failed) {
      const unsub = result.claimResults.filter((r) => r.status === 'UNSUBSTANTIATED').length;
      if (unsub > 0) {
        console.log(`\x1b[33m[STATUS: ON TRACK — ${unsub} UNSUBSTANTIATED CLAIM(S)]\x1b[0m`);
        console.log('Core checks passed, but some claims could not be proven true or false.');
        process.exit(0);
      }
      console.log('\x1b[32m[STATUS: ON TRACK]\x1b[0m');
      console.log('No orphans, no stubs, type check passed, clean worktrees, no surprise deps, all claims verified.');
      process.exit(0);
    }

    console.log('\x1b[31m[STATUS: DRIFT DETECTED]\x1b[0m');
    console.log('Fix the above before committing.');
    process.exit(1);
  });

program
  .command('complete')
  .description('Re-verify, then archive the milestone (blocks if drift detected)')
  .action(async () => {
    const current = registry.getCurrent();
    if (!current) {
      console.log('\x1b[33m[SHIELD: NO ACTIVE GOAL]\x1b[0m');
      process.exit(1);
    }

    const config = loadConfig(cwd);
    console.log(`\x1b[36m[SHIELD: COMPLETE — re-verifying before archive]\x1b[0m`);
    console.log(`  Goal: ${current.goal}\n`);

    const result = runASTAudit(cwd, config, current);

    const failed =
      result.orphans.length > 0 ||
      result.stubs.length > 0 ||
      !result.typeCheck.passed ||
      result.worktreeIssues.length > 0 ||
      result.packageIssues.length > 0 ||
      result.claimResults.some((r) => r.status === 'FALSE' || r.duplicate);

    if (failed) {
      console.log('\x1b[31m[CANNOT ARCHIVE — verification failed]\x1b[0m');
      console.log('Run `shield verify` to see details. Fix the issues, then try again.');
      process.exit(1);
    }

    let endCommit = current.startCommit;
    try {
      endCommit = (await git.revparse(['HEAD'])).trim();
    } catch {}

    const report = archiveObjective(cwd, current, result, endCommit);
    registry.completeObjective(current.id, endCommit);

    console.log(`\x1b[32m[MILESTONE ARCHIVED]\x1b[0m`);
    console.log(`  Objective:  ${current.id}`);
    console.log(`  Duration:   ${report.durationMinutes} min`);
    console.log(`  Report:     ${report.path}`);
  });

program
  .command('switch <id>')
  .description('Switch to a different active objective')
  .action((id: string) => {
    const success = registry.switchObjective(id);
    if (!success) {
      console.log(`\x1b[31m[SHIELD ERROR]\x1b[0m No objective with id "${id}"`);
      process.exit(1);
    }
    const obj = registry.getCurrent();
    console.log(`\x1b[32m[SHIELD: SWITCHED]\x1b[0m Now tracking: ${obj?.id}`);
    console.log(`  Goal: ${obj?.goal}`);
  });

program
  .command('inject-rules')
  .description('Inject shield guardrails into .claude, .cursorrules, .clinerules, .windsurfrules, .antigravity')
  .action(() => {
    const results = injectRules(cwd);
    console.log(`\x1b[36m[SHIELD: RULES INJECTED]\x1b[0m\n`);
    const colorFor = (s: string) => {
      if (s === 'created') return '\x1b[32m';
      if (s === 'appended') return '\x1b[32m';
      if (s === 'updated') return '\x1b[36m';
      return '\x1b[33m';
    };
    for (const r of results) {
      const rel = path.relative(cwd, r.path);
      console.log(`  ${colorFor(r.status)}${r.status.padEnd(10)}\x1b[0m ${rel}`);
    }
    console.log('\nAll AI clients in this repo will now enforce these rules.');
  });

program
  .command('list')
  .alias('status')
  .description('Show all objectives')
  .action(() => {
    const objs = registry.list();
    if (objs.length === 0) {
      console.log('[SHIELD] No objectives yet. Run: shield goal "<objective>"');
      return;
    }
    const reg = registry.load();
    console.log(`\x1b[36m[SHIELD: OBJECTIVES]\x1b[0m\n`);
    for (const o of objs) {
      const marker = o.id === reg.currentObjectiveId ? '▶' : ' ';
      const color = o.status === 'active' ? '\x1b[33m' : '\x1b[32m';
      console.log(`${marker} ${o.id}`);
      console.log(`    Goal:    ${o.goal}`);
      console.log(`    Status:  ${color}${o.status}\x1b[0m`);
      console.log(`    Started: ${o.startTime}`);
      if (o.completedAt) console.log(`    Ended:   ${o.completedAt}`);
      console.log(`    Claims:  ${o.claims.length}`);
      console.log('');
    }
  });


program
  .command('init')
  .description('Set up shield in current project (pre-commit hook + AI rules + config)')
  .action(() => {
    try {
      execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    } catch {
      console.error('\x1b[31m[SHIELD ERROR]\x1b[0m Not a git repository.');
      process.exit(1);
    }

    const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
    if (fs.existsSync(hookPath)) {
      const backup = hookPath + '.backup.' + Date.now();
      fs.copyFileSync(hookPath, backup);
      console.log('\x1b[33m[SHIELD]\x1b[0m Backed up existing hook to ' + path.basename(backup));
    }
    fs.writeFileSync(hookPath, '#!/bin/sh\n# Anti-Drift Shield\nshield verify\n');
    fs.chmodSync(hookPath, 0o755);
    console.log('\x1b[32m[SHIELD]\x1b[0m Pre-commit hook installed');

    const results = injectRules(cwd);
    console.log('\x1b[32m[SHIELD]\x1b[0m Rules injected into ' + results.length + ' AI client configs');

    const configPath = path.join(cwd, '.shieldrc.json');
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        tsconfigPath: './tsconfig.json',
        entrypointPatterns: ['page.', 'route.', 'layout.', 'index.', 'main.', 'app.'],
        stubMarkers: ['// TODO', '// FIXME', 'throw new Error(\"Not implemented\")'],
        ignorePatterns: ['node_modules/', 'dist/', '.next/'],
        enableTypeCheck: true,
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');
      console.log('\x1b[32m[SHIELD]\x1b[0m Created .shieldrc.json');
    }

    const gitignorePath = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const ignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (!ignoreContent.includes('.shield/')) {
        fs.appendFileSync(gitignorePath, '\n.shield/\n');
      }
    } else {
      fs.writeFileSync(gitignorePath, '.shield/\n');
    }
    console.log('\x1b[32m[SHIELD READY]\x1b[0m Next: shield goal "<what you are building>"');
  });

program.parse(process.argv);
