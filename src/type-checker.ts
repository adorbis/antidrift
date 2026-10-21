import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TypeCheckResult, ShieldConfig } from './types';

export function runTypeCheck(cwd: string, config: ShieldConfig): TypeCheckResult {
  if (!config.enableTypeCheck) return { passed: true, skipped: true, reason: 'Disabled' };

  const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
  if (fs.existsSync(tsconfigPath)) {
    const tsconfigDir = path.dirname(tsconfigPath);
    try {
      execSync(`npx tsc --noEmit -p "${tsconfigPath}"`, {
        cwd: tsconfigDir,
        stdio: 'pipe',
        timeout: 180_000,
      });
    } catch (err: any) {
      return { passed: false, skipped: false, errorOutput: `TypeScript Error:\n${err.stdout?.toString()}` };
    }
  }

  if (fs.existsSync(path.join(cwd, 'requirements.txt')) || fs.existsSync(path.join(cwd, 'pyproject.toml'))) {
    try { execSync('python3 -m compileall -q .', { cwd, stdio: 'pipe' }); } 
    catch (err: any) { return { passed: false, skipped: false, errorOutput: `Python Error:\n${err.stdout?.toString()}` }; }
  }
  
  if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    try { execSync('cargo check --quiet', { cwd, stdio: 'pipe' }); } 
    catch (err: any) { return { passed: false, skipped: false, errorOutput: `Rust Error:\n${err.stderr?.toString()}` }; }
  }
  
  if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    try { execSync('go build ./...', { cwd, stdio: 'pipe' }); } 
    catch (err: any) { return { passed: false, skipped: false, errorOutput: `Go Error:\n${err.stderr?.toString()}` }; }
  }
  
  return { passed: true, skipped: false };
}
