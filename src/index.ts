#!/usr/bin/env node
import { Command } from 'commander';
import simpleGit from 'simple-git';
import { RegistryManager, slugify } from './registry';
import { Objective } from './types';

const program = new Command();
const cwd = process.cwd();
const registry = new RegistryManager(cwd);
const git = simpleGit(cwd);

program
  .name('shield')
  .description('Anti-Drift Shield: universal AI verification engine')
  .version('0.1.0');

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
  .command('status')
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
      console.log('');
    }
  });

program.parse(process.argv);
