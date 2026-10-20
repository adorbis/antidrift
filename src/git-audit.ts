import { execSync } from 'child_process';

export function getChangedFiles(cwd: string): string[] {
  const status = execSync('git status --porcelain -uall', { cwd, encoding: 'utf-8' });
  const files: string[] = [];

  for (const line of status.split('\n')) {
    if (!line.trim()) continue;
    const xy = line.substring(0, 2);
    if (xy.includes('D')) continue; // skip deleted
    files.push(line.substring(3).trim());
  }

  // FALLBACK: If no changes, scan all .ts/.tsx files so we don't miss orphans in a clean repo
  if (files.length === 0) {
    try {
      const findCmd = process.platform === 'win32'
        ? 'dir /s /b *.ts *.tsx'
        : 'find . -type f \\\\( -name "*.ts" -o -name "*.tsx" \\\\) -not -path "*/node_modules/*" -not -path "*/dist/*"';
      
      const allFiles = execSync(findCmd, { cwd, encoding: 'utf-8' }).toString();
      for (let f of allFiles.split('\n')) {
        f = f.trim().replace(/^\.\//, ''); // clean up ./ prefix
        if (f) files.push(f);
      }
    } catch { /* ignore errors during fallback scan */ }
  }

  return files;
}
