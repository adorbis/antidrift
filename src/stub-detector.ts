import { SourceFile, SyntaxKind } from 'ts-morph';

export interface StubFinding {
  lineNumber: number;
  text: string;
}

/**
 * Detects stubs by walking the AST, not by raw text matching.
 * Only real comment nodes and real throw statements are checked —
 * string literals that merely mention "// TODO" are NOT flagged.
 */
export function findStubsInSourceFile(
  sourceFile: SourceFile,
  stubMarkers: string[]
): StubFinding[] {
  const findings: StubFinding[] = [];

  // 1. Comments — line and block
  const commentMarkers = stubMarkers.filter((m) => m.trim().startsWith('//') || m.trim().startsWith('/*'));
  if (commentMarkers.length > 0) {
    const comments = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.SingleLineCommentTrivia),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MultiLineCommentTrivia),
    ];
    for (const comment of comments) {
      const text = comment.getText();
      if (commentMarkers.some((m) => text.includes(m))) {
        findings.push({
          lineNumber: comment.getStartLineNumber(),
          text: text.trim().slice(0, 100),
        });
      }
    }
  }

  // 2. Throw statements — e.g. throw new Error("Not implemented")
  const throwMarkers = stubMarkers.filter((m) => m.trim().startsWith('throw'));
  if (throwMarkers.length > 0) {
    const throws = sourceFile.getDescendantsOfKind(SyntaxKind.ThrowStatement);
    for (const t of throws) {
      const text = t.getText();
      if (throwMarkers.some((m) => text.includes(m))) {
        findings.push({
          lineNumber: t.getStartLineNumber(),
          text: text.trim().slice(0, 100),
        });
      }
    }
  }

  return findings;
}

export function hasStubInSourceFile(
  sourceFile: SourceFile,
  stubMarkers: string[]
): boolean {
  return findStubsInSourceFile(sourceFile, stubMarkers).length > 0;
}
