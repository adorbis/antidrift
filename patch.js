const fs = require('fs');
let content = fs.readFileSync('src/index.ts', 'utf8');

// Fix the version string
content = content.replace(".version('0.1.0')", ".version('0.1.3')");

// The missing init command
const initCommand = `
program
  .command('init')
  .description('Set up shield in current project (pre-commit hook + AI rules + config)')
  .action(() => {
    try {
      execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    } catch {
      console.error('\\x1b[31m[SHIELD ERROR]\\x1b[0m Not a git repository.');
      process.exit(1);
    }

    const hookPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
    if (fs.existsSync(hookPath)) {
      const backup = hookPath + '.backup.' + Date.now();
      fs.copyFileSync(hookPath, backup);
      console.log('\\x1b[33m[SHIELD]\\x1b[0m Backed up existing hook to ' + path.basename(backup));
    }
    fs.writeFileSync(hookPath, '#!/bin/sh\\n# Anti-Drift Shield\\nshield verify\\n');
    fs.chmodSync(hookPath, 0o755);
    console.log('\\x1b[32m[SHIELD]\\x1b[0m Pre-commit hook installed');

    const results = injectRules(cwd);
    console.log('\\x1b[32m[SHIELD]\\x1b[0m Rules injected into ' + results.length + ' AI client configs');

    const configPath = path.join(cwd, '.shieldrc.json');
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        tsconfigPath: './tsconfig.json',
        entrypointPatterns: ['page.', 'route.', 'layout.', 'index.', 'main.', 'app.'],
        stubMarkers: ['// TODO', '// FIXME', 'throw new Error(\\"Not implemented\\")'],
        ignorePatterns: ['node_modules/', 'dist/', '.next/'],
        enableTypeCheck: true,
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\\n');
      console.log('\\x1b[32m[SHIELD]\\x1b[0m Created .shieldrc.json');
    }

    const gitignorePath = path.join(cwd, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const ignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (!ignoreContent.includes('.shield/')) {
        fs.appendFileSync(gitignorePath, '\\n.shield/\\n');
      }
    } else {
      fs.writeFileSync(gitignorePath, '.shield/\\n');
    }
    console.log('\\x1b[32m[SHIELD READY]\\x1b[0m Next: shield goal "<what you are building>"');
  });

program.parse(process.argv);`;

if (!content.includes("command('init')")) {
  content = content.replace('program.parse(process.argv);', initCommand);
}

fs.writeFileSync('src/index.ts', content);
console.log('✅ src/index.ts patched successfully.');
