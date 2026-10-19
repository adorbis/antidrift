import * as fs from 'fs';
import * as path from 'path';
import { Objective, AuditResult } from './types';

export interface ArchiveReport {
  path: string;
  durationMinutes: number;
}

export function archiveObjective(
  cwd: string,
  objective: Objective,
  auditResult: AuditResult,
  endCommit: string
): ArchiveReport {
  const archiveDir = path.join(cwd, '.shield', 'archives');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const finish = new Date();
  const start = new Date(objective.startTime);
  const durationMinutes = Math.round((finish.getTime() - start.getTime()) / 60000);

  const ts = finish.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivePath = path.join(archiveDir, `ARCHIVE_${ts}_${objective.id}.md`);

  const claimLines =
    auditResult.claimResults.length === 0
      ? '_No claims registered_'
      : auditResult.claimResults
          .map((r) => {
            const icon =
              r.status === 'VERIFIED' ? '✓' : r.status === 'FALSE' ? '✗' : '?';
            return `- ${icon} **${r.status}** — "${r.claim.text}"\n  → ${r.details}`;
          })
          .join('\n');

  const content = `# Milestone Archive: ${objective.goal}

**Objective ID:** \`${objective.id}\`
**Status:** COMPLETED (verified)

## Timestamps
- **Start:** ${objective.startTime}
- **Finish:** ${finish.toISOString()}
- **Duration:** ${durationMinutes} minutes

## Git
- **Start Commit:** ${objective.startCommit}
- **End Commit:** ${endCommit}
- **Branch:** ${objective.branch}

## Scope
${objective.scope.length > 0 ? objective.scope.map((s) => `- ${s}`).join('\n') : '_No scope restriction_ (whole repo)'}

## Claims Verified
${claimLines}

## Verification Summary
- **Files audited:** ${auditResult.changedFiles.length}
- **Orphans:** ${auditResult.orphans.length}
- **Stubs:** ${auditResult.stubs.length}
- **Type check:** ${auditResult.typeCheck.skipped ? 'skipped' : auditResult.typeCheck.passed ? 'passed' : 'FAILED'}
- **Worktree issues:** ${auditResult.worktreeIssues.length}
- **Package issues:** ${auditResult.packageIssues.length}

---

*Archived by Anti-Drift Shield on ${finish.toISOString()}*
`;

  fs.writeFileSync(archivePath, content);
  return { path: archivePath, durationMinutes };
}
