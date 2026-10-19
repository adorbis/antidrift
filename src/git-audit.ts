import { execSync } from 'child_process';

export function getChangedFiles(cwd: string): string[] {
  const status = execSync('git status --porcelain', {
    cwd,
    encoding: 'utf-8',
  });

  const files: string[] = [];
  for (const line of status.split('\n')) {
    if (!line.trim()) continue;
    const xy = line.substring(0, 2);
    if (xy.includes('D')) continue; // skip deleted files
    const filePath = line.substring(3).trim();
    files.push(filePath);
  }
  return files;
}

export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
