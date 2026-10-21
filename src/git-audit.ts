import { execSync } from 'child_process';

export function getChangedFiles(cwd: string): string[] {
  const status = execSync('git status --porcelain -uall', { cwd, encoding: 'utf-8' });
  const files: string[] = [];

  for (const line of status.split('\n')) {
    if (!line.trim()) continue;
    if (line.substring(0, 2).includes('D')) continue;
    files.push(line.substring(3).trim());
  }

  if (files.length === 0) {
    try {
      const allFiles = execSync('git ls-files -co --exclude-standard', { cwd, encoding: 'utf-8' }).toString();
      for (let f of allFiles.split('\n')) {
        f = f.trim();
        if (f && (f.endsWith('.ts') || f.endsWith('.tsx'))) files.push(f);
      }
    } catch {}
  }
  return files;
}

export function isGitRepo(cwd: string): boolean {
  try { execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' }); return true; } catch { return false; }
}
