import { execSync } from 'child_process';
import { PackageIssue, Objective } from './types';

const PACKAGE_FILES = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

export function auditPackages(cwd: string, objective: Objective): PackageIssue[] {
  const issues: PackageIssue[] = [];

  try {
    const diff = execSync(
      `git diff --name-only ${objective.startCommit} HEAD`,
      { cwd, stdio: 'pipe', encoding: 'utf-8' }
    ).toString();

    const changedFiles = diff.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const pkgFile of PACKAGE_FILES) {
      if (changedFiles.includes(pkgFile)) {
        issues.push({
          file: pkgFile,
          message: `Changed since objective started — verify this dependency change is intentional`,
        });
      }
    }

    // Also check uncommitted package changes
    const status = execSync('git status --porcelain', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).toString();

    for (const pkgFile of PACKAGE_FILES) {
      if (status.includes(pkgFile) && !issues.some((i) => i.file === pkgFile)) {
        issues.push({
          file: pkgFile,
          message: 'Modified but not committed — verify this is expected',
        });
      }
    }
  } catch {
    // Not a git repo or no startCommit — skip
  }

  return issues;
}
