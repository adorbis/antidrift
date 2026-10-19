import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { Claim, ClaimResult, Objective, ShieldConfig } from './types';
import { hasStubInSourceFile } from './stub-detector';

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.shield']);

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function extractCandidates(text: string): string[] {
  const candidates = new Set<string>();
  const quoted = text.match(/["'`]([^"'`]{2,40})["'`]/g) || [];
  for (const q of quoted) candidates.add(q.slice(1, -1));
  const camel = text.match(/\b[A-Z][a-z]+[A-Z]\w*\b/g) || [];
  for (const c of camel) candidates.add(c);
  const files = text.match(/\b[\w-]+\.(ts|tsx|js|jsx)\b/g) || [];
  for (const f of files) candidates.add(f);
  return Array.from(candidates);
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMatchingFiles(cwd: string, candidate: string): string[] {
  const allFiles = walkSourceFiles(cwd);
  const needle = normalize(candidate);
  if (needle.length < 3) return [];
  return allFiles.filter((f) => normalize(path.basename(f)).includes(needle));
}

function claimMentions(claimText: string, keywords: string[]): boolean {
  const lower = claimText.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function verifyClaim(
  cwd: string,
  config: ShieldConfig,
  claim: Claim
): { status: 'VERIFIED' | 'FALSE' | 'UNSUBSTANTIATED'; details: string } {
  const candidates = extractCandidates(claim.text);
  if (candidates.length === 0) {
    return {
      status: 'UNSUBSTANTIATED',
      details: 'No verifiable entity found in claim (no CamelCase, quoted names, or file names)',
    };
  }

  const wantsWired = claimMentions(claim.text, [
    'wired', 'integrated', 'connected', 'imported',
    'hooked up', 'registered', 'included in', 'mounted',
  ]);
  const wantsComplete = claimMentions(claim.text, [
    'built', 'build',
    'complete', 'completed', 'done', 'finished',
    'implemented', 'ready',
  ]);

  const tsconfigPath = path.resolve(cwd, config.tsconfigPath);
  const tsconfigExists = fs.existsSync(tsconfigPath);
  const project = tsconfigExists
    ? new Project({ tsConfigFilePath: tsconfigPath })
    : null;

  const notes: string[] = [];
  let foundCount = 0;

  for (const candidate of candidates) {
    const matches = findMatchingFiles(cwd, candidate);
    if (matches.length === 0) continue;

    foundCount++;

    for (const match of matches) {
      const rel = path.relative(cwd, match);

      if (wantsWired && project) {
        const sf = project.getSourceFile(match) ?? project.addSourceFileAtPath(match);
        if (sf) {
          const refs = sf.getReferencingSourceFiles();
          if (refs.length === 0) {
            return {
              status: 'FALSE',
              details: `Claim mentions "${candidate}" is wired, but ${rel} is never imported anywhere`,
            };
          }
          notes.push(`"${candidate}": ${rel} imported by ${refs.length} file(s)`);
        }
      }

      if (wantsComplete && project) {
        // AST-level stub check — never raw text matching
        const sf = project.getSourceFile(match) ?? project.addSourceFileAtPath(match);
        if (sf && hasStubInSourceFile(sf, config.stubMarkers)) {
          return {
            status: 'FALSE',
            details: `Claim mentions "${candidate}" is complete/built, but ${rel} contains actual stub markers (comments or throw statements)`,
          };
        }
        notes.push(`"${candidate}": ${rel} exists with no stubs`);
        continue;
      }

      if (!wantsWired && !wantsComplete) {
        notes.push(`"${candidate}": ${rel} exists on disk`);
      }
    }
  }

  if (foundCount === 0) {
    return {
      status: 'UNSUBSTANTIATED',
      details: `No referenced entity found on disk (checked: ${candidates.join(', ')})`,
    };
  }

  return { status: 'VERIFIED', details: notes.join('; ') };
}

export function verifyAllClaims(
  cwd: string,
  config: ShieldConfig,
  objective: Objective
): ClaimResult[] {
  const results: ClaimResult[] = [];
  const seenTexts = new Map<string, number>();

  for (const claim of objective.claims) {
    const normalized = claim.text.trim().toLowerCase();
    const seenCount = seenTexts.get(normalized) || 0;
    seenTexts.set(normalized, seenCount + 1);

    const { status, details } = verifyClaim(cwd, config, claim);
    results.push({
      claim,
      status,
      details,
      duplicate: seenCount > 0,
    });
  }

  return results;
}
