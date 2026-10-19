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
    return { passed: true, skipped: true, reason: 'No tsconfig found' };
  }

  try {
    execSync('npx tsc --noEmit', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 120_000,
    });
    return { passed: true, skipped: false };
  } catch (err: any) {
    const output = (err.stdout || '').toString() || err.message || 'Type check failed';
    return { passed: false, skipped: false, errorOutput: output };
  }
}
