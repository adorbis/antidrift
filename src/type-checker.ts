import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TypeCheckResult, ShieldConfig } from './types';

export function runTypeCheck(cwd: string, config: ShieldConfig): TypeCheckResult {
  if (!config.enableTypeCheck) {
    return { passed: true, skipped: true, reason: 'Disabled in .shieldrc' };
  }

  const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
  if (!fs.existsSync(tsconfigPath)) {
    return { passed: true, skipped: true, reason: `No tsconfig at ${config.tsconfigPath}` };
  }

  // Run tsc from the directory that contains tsconfig — that's where node_modules lives
  const tsconfigDir = path.dirname(tsconfigPath);
  const localTsc = path.join(tsconfigDir, 'node_modules', '.bin', 'tsc');
  const hasLocalTsc = fs.existsSync(localTsc);

  if (!hasLocalTsc) {
    return {
      passed: true,
      skipped: true,
      reason: `typescript not installed in ${path.relative(cwd, tsconfigDir)}/node_modules — run 'npm install' there`,
    };
  }

  try {
    execSync(`"${localTsc}" --noEmit`, {
      cwd: tsconfigDir,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 180_000,
    });
    return { passed: true, skipped: false };
  } catch (err: any) {
    const output = (err.stdout || '').toString() || err.message || 'Type check failed';
    return { passed: false, skipped: false, errorOutput: output };
  }
}
