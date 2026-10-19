import * as fs from 'fs';
import * as path from 'path';

const START_MARKER = '<!-- ANTI-DRIFT-SHIELD:START -->';
const END_MARKER = '<!-- ANTI-DRIFT-SHIELD:END -->';

export interface InjectResult {
  path: string;
  status: 'created' | 'appended' | 'updated' | 'unchanged';
}

const GUARDRAILS = `# Anti-Drift Shield — Mandatory Guardrails

**Before claiming ANY task is built, wired, integrated, or complete, you MUST:**

1. **Verify physical existence.** If you say you created a file, it must exist on disk.
2. **Verify wiring.** If you say a component/route/API is "wired" or "integrated", it MUST be explicitly imported and invoked in an entrypoint (page, route, index, layout, or main).
3. **Verify completeness.** No \`// TODO\`, \`// FIXME\`, \`throw new Error("Not implemented")\`, or placeholder returns in code you claim is done.
4. **Verify no scope creep.** Do NOT add features, dependencies, or refactors outside the current \`shield goal\`.
5. **Run \`shield verify\`** and confirm it returns \`STATUS: ON TRACK\` before declaring the task complete.
6. **Register claims**: use \`shield claim "<what you claim>"\` so the tool can physically verify them.

If \`shield verify\` fails, fix the reported issues. Do NOT commit, do NOT declare complete, do NOT ignore.`;

function injectIntoFile(filePath: string): InjectResult {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const block = `${START_MARKER}\n${GUARDRAILS}\n${END_MARKER}`;

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, block + '\n');
    return { path: filePath, status: 'created' };
  }

  const existing = fs.readFileSync(filePath, 'utf-8');

  if (existing.includes(START_MARKER) && existing.includes(END_MARKER)) {
    const regex = new RegExp(
      `${START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
    );
    const updated = existing.replace(regex, block);
    if (updated === existing) return { path: filePath, status: 'unchanged' };
    fs.writeFileSync(filePath, updated);
    return { path: filePath, status: 'updated' };
  }

  fs.writeFileSync(filePath, existing.trimEnd() + '\n\n' + block + '\n');
  return { path: filePath, status: 'appended' };
}

export function injectRules(cwd: string): InjectResult[] {
  const targets = [
    path.join(cwd, '.claude', 'commands', 'observer.md'),
    path.join(cwd, 'CLAUDE.md'),
    path.join(cwd, '.cursorrules'),
    path.join(cwd, '.clinerules'),
    path.join(cwd, '.windsurfrules'),
    path.join(cwd, '.antigravity', 'rules.md'),
  ];

  return targets.map((t) => injectIntoFile(t));
}
