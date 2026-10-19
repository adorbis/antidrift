import * as fs from 'fs';
import * as path from 'path';
import { ShieldConfig } from './types';

const DEFAULT_CONFIG: ShieldConfig = {
  entrypointPatterns: [
    'page.', 'route.', 'layout.', 'loading.', 'error.',
    'index.', 'main.', 'app.', 'server.'
  ],
  stubMarkers: ['// TODO', '// FIXME', 'throw new Error("Not implemented")'],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '.next/', '*.test.ts', '*.spec.ts'],
  enableTypeCheck: true,
  tsconfigPath: './tsconfig.json',
};

export function loadConfig(cwd: string): ShieldConfig {
  const configFile = path.join(cwd, '.shieldrc.json');
  if (!fs.existsSync(configFile)) return DEFAULT_CONFIG;
  try {
    const userConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    console.warn('[SHIELD] Warning: .shieldrc.json is malformed. Using defaults.');
    return DEFAULT_CONFIG;
  }
}

export { DEFAULT_CONFIG };
