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

export function runASTAudit(
  cwd: string,
  config: ShieldConfig,
  objective: Objective
): AuditResult {
  const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
  const hasTsconfig = fs.existsSync(tsconfigPath);

  if (!hasTsconfig) {
    console.log('\x1b[33m[SHIELD WARNING]\x1b[0m No tsconfig found. Parsing files with default config.');
  }

  const allChanged = getChangedFiles(cwd);
  const relevantChanged = allChanged.filter(
    (f) => isTypeScript(f) && !matchesIgnore(f, config.ignorePatterns)
  );

  const orphans: string[] = [];
  const stubs: string[] = [];

  if (relevantChanged.length > 0) {
    // Fallback to default project config if tsconfig is missing
    const project = hasTsconfig
      ? new Project({ tsConfigFilePath: tsconfigPath })
      : new Project({ compilerOptions: { allowJs: true, jsx: 1 } });

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
