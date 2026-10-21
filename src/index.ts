#!/usr/bin/env node
import { Command } from 'commander';
import updateNotifier from 'update-notifier';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';
import simpleGit from 'simple-git';
import { RegistryManager, slugify } from './registry';
import { Objective, Claim } from './types';
import { loadConfig } from './config';
import { runASTAudit } from './ast-verifier';
import { archiveObjective } from './archiver';
import { injectRules } from './rule-injector';

const pkg = require('../package.json');
updateNotifier({ pkg }).notify();

const program = new Command();
const cwd = process.cwd();
const registry = new RegistryManager(cwd);
const git = simpleGit(cwd);

program.name('antidrift').version(pkg.version);

program.command('goal <objective>').description('Set active goal').option('--scope <dirs>', 'Allowed directories').action(async (goal: string, opts: any) => {
  const branch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim();
  const startCommit = (await git.revparse(['HEAD'])).trim();
  const scope = opts.scope ? opts.scope.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const baseId = slugify(goal);
  const reg = registry.load();
  let id = baseId, counter = 1;
  while (reg.objectives[id]) id = `${baseId}-${counter++}`;
  registry.addObjective({ id, goal, startTime: new Date().toISOString(), branch, startCommit, scope, status: 'active', claims: [] });
  console.log(`\x1b[32m[SHIELD: GOAL SET]\x1b[0m ID: ${id}`);
});

program.command('claim <text>').description('Register AI claim').action((text: string) => {
  const current = registry.getCurrent();
  if (!current) { console.log('\x1b[33m[SHIELD: NO ACTIVE GOAL]\x1b[0m'); process.exit(1); }
  registry.addClaim(current.id, { id: `c-${Date.now()}`, text, registeredAt: new Date().toISOString(), verified: null, lastVerifiedAt: null, details: '' });
  console.log(`\x1b[32m[SHIELD: CLAIM REGISTERED]\x1b[0m "${text}"`);
});

program.command('verify').description('Verify codebase').action(() => {
  const current = registry.getCurrent();
  if (!current) { console.log('\x1b[33m[SHIELD: NO ACTIVE GOAL]\x1b[0m'); process.exit(1); }
  const config = loadConfig(cwd);
  const result = runASTAudit(cwd, config, current);
  let failed = false;
  if (result.orphans.length > 0) { failed = true; console.log('\x1b[31m[ORPHANS]\x1b[0m'); result.orphans.forEach(f => console.log(`  ✗ ${f}`)); }
  if (result.stubs.length > 0) { failed = true; console.log('\x1b[31m[STUBS]\x1b[0m'); result.stubs.forEach(f => console.log(`  ✗ ${f}`)); }
  if (!result.typeCheck.passed) { failed = true; console.log('\x1b[31m[TYPE CHECK FAILED]\x1b[0m\n' + result.typeCheck.errorOutput); }
  if (failed) { console.log('\n\x1b[31m[STATUS: DRIFT DETECTED]\x1b[0m'); process.exit(1); }
  console.log('\n\x1b[32m[STATUS: ON TRACK]\x1b[0m');
});

program.command('complete').description('Archive milestone').action(async () => {
  const current = registry.getCurrent();
  if (!current) { console.log('No active goal.'); return; }
  const config = loadConfig(cwd);
  const result = runASTAudit(cwd, config, current);
  if (!result.passed) { console.log('\x1b[31m[CANNOT ARCHIVE — DRIFT DETECTED]\x1b[0m'); process.exit(1); }
  const endCommit = (await git.revparse(['HEAD'])).trim();
  const report = archiveObjective(cwd, current, result, endCommit);
  registry.completeObjective(current.id, endCommit);
  console.log(`\x1b[32m[MILESTONE ARCHIVED]\x1b[0m ${report.path}`);
});

program.command('init').description('Install hook, rules, and config').action(() => {
  try { execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' }); } catch { console.error('Not a git repo.'); process.exit(1); }
  const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookPath, '#!/bin/sh\nif [ -f ".shield/paused" ]; then\n  echo "[SHIELD] Paused."\n  exit 0\nfi\nantidrift verify\n');
  fs.chmodSync(hookPath, 0o755);
  injectRules(cwd);
  const configPath = path.join(cwd, '.shieldrc.json');
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({ tsconfigPath: './tsconfig.json', entrypointPatterns: ['page.', 'route.', 'index.', 'main.', 'app.', 'serve.'], stubMarkers: ['// TODO', '// FIXME'], ignorePatterns: ['node_modules/', 'dist/'], enableTypeCheck: true }, null, 2));
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath) && !fs.readFileSync(gitignorePath, 'utf-8').includes('.shield/')) fs.appendFileSync(gitignorePath, '\n.shield/\n');
  console.log('\x1b[32m[SHIELD READY]\x1b[0m');
});

program.command('status').description('Show enforcement status').action(() => {
  const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
  const pausePath = path.join(cwd, '.shield', 'paused');
  const current = registry.getCurrent();
  console.log('\\x1b[36m[SHIELD: STATUS]\\x1b[0m');
  console.log('  Initialized: ' + (fs.existsSync(path.join(cwd, '.shieldrc.json')) ? 'yes' : 'no'));
  console.log('  Git hook:    ' + (fs.existsSync(hookPath) ? 'installed' : 'missing'));
  console.log('  Enforcement: ' + (fs.existsSync(pausePath) ? 'PAUSED' : fs.existsSync(hookPath) ? 'ACTIVE' : 'INACTIVE'));
  console.log('  Goal:        ' + (current ? current.goal : 'none'));
});

program.command('pause').description('Temporarily pause verification').action(() => {
  const shieldDir = path.join(cwd, '.shield');
  if (!fs.existsSync(shieldDir)) fs.mkdirSync(shieldDir, { recursive: true });
  fs.writeFileSync(path.join(shieldDir, 'paused'), 'paused\n');
  console.log('\x1b[33m[SHIELD: PAUSED]\x1b[0m');
});

program.command('resume').description('Resume verification').action(() => {
  const pausePath = path.join(cwd, '.shield', 'paused');
  if (fs.existsSync(pausePath)) { fs.unlinkSync(pausePath); console.log('\x1b[32m[SHIELD: RESUMED]\x1b[0m'); } 
  else { console.log('[SHIELD] Not paused.'); }
});

program.parse(process.argv);
