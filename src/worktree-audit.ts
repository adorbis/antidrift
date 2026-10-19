import { execSync } from 'child_process';
import { WorktreeIssue } from './types';

export function auditWorktrees(cwd: string): WorktreeIssue[] {
  const issues: WorktreeIssue[] = [];
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    const blocks = output.split('\n\n').filter((b) => b.trim());
    for (const block of blocks) {
      const lines = block.split('\n');
      const wtLine = lines.find((l) => l.startsWith('worktree '));
      if (!wtLine) continue;
      const wtPath = wtLine.substring(9);

      if (lines.some((l) => l.trim() === 'detached')) {
        issues.push({ path: wtPath, issue: 'DETACHED HEAD — commits will be lost' });
      }
    }
  } catch {
    // No worktree support or not a git repo — skip silently
  }
  return issues;
}
