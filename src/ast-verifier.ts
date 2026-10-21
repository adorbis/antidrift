import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { ShieldConfig, AuditResult, Objective } from './types';
import { getChangedFiles } from './git-audit';
import { runTypeCheck } from './type-checker';
import { auditWorktrees } from './worktree-audit';
import { auditPackages } from './package-audit';
import { verifyAllClaims } from './claim-verifier';
import { hasStubInSourceFile } from './stub-detector';

const UNIVERSAL_STUB_PATTERNS = ['TODO', 'FIXME', 'Not implemented', 'NotImplemented', 'panic!("TODO', 'unimplemented!()', 'raise NotImplementedError'];

export function runASTAudit(cwd: string, config: ShieldConfig, objective: Objective): AuditResult {
  const allChanged = getChangedFiles(cwd);
  const orphans: string[] = [];
  const stubs: string[] = [];
  const tsFiles = allChanged.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  const otherFiles = allChanged.filter(f => !f.endsWith('.ts') && !f.endsWith('.tsx') && !f.endsWith('.md') && !f.endsWith('.json') && !matchesIgnore(f, config.ignorePatterns));

  if (tsFiles.length > 0) {
    const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
    const hasTsconfig = fs.existsSync(tsconfigPath);
    if (!hasTsconfig) console.log('\x1b[33m[SHIELD WARNING]\x1b[0m No tsconfig found. Parsing TS with defaults.');
    const project = hasTsconfig ? new Project({ tsConfigFilePath: tsconfigPath }) : new Project({ compilerOptions: { allowJs: true, jsx: 1 } });
    for (const f of tsFiles) { try { project.addSourceFileAtPath(path.resolve(cwd, f)); } catch {} }
    for (const f of tsFiles) {
      const sf = project.getSourceFile(path.resolve(cwd, f));
      if (!sf) continue;
      const isEntry = config.entrypointPatterns.some(p => f.includes(p));
      if (sf.getReferencingSourceFiles().length === 0 && !isEntry) orphans.push(f);
      if (hasStubInSourceFile(sf, config.stubMarkers)) stubs.push(f);
    }
  }

  for (const f of otherFiles) {
    const absPath = path.resolve(cwd, f);
    if (!fs.existsSync(absPath)) continue;
    try {
      const content = fs.readFileSync(absPath, 'utf-8');
      if (UNIVERSAL_STUB_PATTERNS.some(pattern => content.includes(pattern))) stubs.push(f);
    } catch {}
  }

  const typeCheck = runTypeCheck(cwd, config);
  const worktreeIssues = auditWorktrees(cwd);
  const packageIssues = auditPackages(cwd, objective);
  const claimResults = verifyAllClaims(cwd, config, objective);

  const claimsFailed = claimResults.some(r => r.status === 'FALSE' || r.duplicate);
  const passed = orphans.length === 0 && stubs.length === 0 && typeCheck.passed && worktreeIssues.length === 0 && packageIssues.length === 0 && !claimsFailed;
  return { passed, skipped: false, changedFiles: allChanged, orphans, stubs, typeCheck, worktreeIssues, packageIssues, claimResults };
}
