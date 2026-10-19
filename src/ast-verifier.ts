import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { ShieldConfig, AuditResult } from './types';
import { getChangedFiles } from './git-audit';

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

export function runASTAudit(cwd: string, config: ShieldConfig): AuditResult {
  const skippedResult = (reason: string): AuditResult => ({
    passed: true,
    skipped: true,
    reason,
    changedFiles: [],
    orphans: [],
    stubs: [],
  });

  const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
  if (!fs.existsSync(tsconfigPath)) {
    return skippedResult(`No tsconfig at ${config.tsconfigPath} — AST check skipped`);
  }

  const allChanged = getChangedFiles(cwd);
  const relevantChanged = allChanged.filter(
    (f) => isTypeScript(f) && !matchesIgnore(f, config.ignorePatterns)
  );

  if (relevantChanged.length === 0) {
    return skippedResult('No TypeScript changes to verify');
  }

  const project = new Project({ tsConfigFilePath: tsconfigPath });

  // Explicitly add changed files not already in the project
  // (e.g., new files outside the tsconfig include glob)
  for (const filePath of relevantChanged) {
    const abs = path.resolve(cwd, filePath);
    if (!project.getSourceFile(abs)) {
      try {
        project.addSourceFileAtPath(abs);
      } catch {
        // Unparseable file — skip
      }
    }
  }

  const orphans: string[] = [];
  const stubs: string[] = [];

  for (const filePath of relevantChanged) {
    const abs = path.resolve(cwd, filePath);
    const sourceFile = project.getSourceFile(abs);
    if (!sourceFile) continue;

    // 1. Orphan detection — is anything importing this file?
    const refs = sourceFile.getReferencingSourceFiles();
    const isEntry = config.entrypointPatterns.some((p) => filePath.includes(p));
    if (refs.length === 0 && !isEntry) {
      orphans.push(filePath);
    }

    // 2. Stub detection — does the file contain a stub marker?
    const text = sourceFile.getText();
    if (config.stubMarkers.some((marker) => text.includes(marker))) {
      stubs.push(filePath);
    }
  }

  return {
    passed: orphans.length === 0 && stubs.length === 0,
    skipped: false,
    changedFiles: relevantChanged,
    orphans,
    stubs,
  };
}
