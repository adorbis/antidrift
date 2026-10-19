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

function matchesIgnore(filePath: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    if (p.includes('*')) {
      const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(filePath);
    }
    return filePath.startsWith(p) || filePath.includes('/' + p);
  });
}

function isTypeScript(filePath: string): boolean {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

function emptyResult(reason: string): AuditResult {
  return {
    passed: true,
    skipped: true,
    reason,
    changedFiles: [],
    orphans: [],
    stubs: [],
    typeCheck: { passed: true, skipped: true, reason },
    worktreeIssues: [],
    packageIssues: [],
    claimResults: [],
  };
}

export function runASTAudit(
  cwd: string,
  config: ShieldConfig,
  objective: Objective
): AuditResult {
  const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
  if (!fs.existsSync(tsconfigPath)) {
    return emptyResult(`No tsconfig at ${config.tsconfigPath} — AST check skipped`);
  }

  const allChanged = getChangedFiles(cwd);
  const relevantChanged = allChanged.filter(
    (f) => isTypeScript(f) && !matchesIgnore(f, config.ignorePatterns)
  );

  const orphans: string[] = [];
  const stubs: string[] = [];

  if (relevantChanged.length > 0) {
    const project = new Project({ tsConfigFilePath: tsconfigPath });

    for (const filePath of relevantChanged) {
      const abs = path.resolve(cwd, filePath);
      if (!project.getSourceFile(abs)) {
        try {
          project.addSourceFileAtPath(abs);
        } catch {}
      }
    }

    for (const filePath of relevantChanged) {
      const abs = path.resolve(cwd, filePath);
      const sourceFile = project.getSourceFile(abs);
      if (!sourceFile) continue;

      const refs = sourceFile.getReferencingSourceFiles();
      const isEntry = config.entrypointPatterns.some((p) => filePath.includes(p));
      if (refs.length === 0 && !isEntry) orphans.push(filePath);

      // AST-level stub detection — comments and throw statements only
      if (hasStubInSourceFile(sourceFile, config.stubMarkers)) {
        stubs.push(filePath);
      }
    }
  }

  const typeCheck = runTypeCheck(cwd, config);
  const worktreeIssues = auditWorktrees(cwd);
  const packageIssues = auditPackages(cwd, objective);
  const claimResults = verifyAllClaims(cwd, config, objective);

  const claimsFailed = claimResults.some((r) => r.status === 'FALSE' || r.duplicate);

  const passed =
    orphans.length === 0 &&
    stubs.length === 0 &&
    typeCheck.passed &&
    worktreeIssues.length === 0 &&
    packageIssues.length === 0 &&
    !claimsFailed;

  return {
    passed,
    skipped: false,
    changedFiles: relevantChanged,
    orphans,
    stubs,
    typeCheck,
    worktreeIssues,
    packageIssues,
    claimResults,
  };
}
