export interface ShieldConfig {
  entrypointPatterns: string[];
  stubMarkers: string[];
  ignorePatterns: string[];
  enableTypeCheck: boolean;
  tsconfigPath: string;
}

export interface Claim {
  id: string;
  text: string;
  registeredAt: string;
  verified: boolean | null;
  lastVerifiedAt: string | null;
  details: string;
}

export interface Objective {
  id: string;
  goal: string;
  startTime: string;
  branch: string;
  startCommit: string;
  scope: string[];
  status: 'active' | 'completed';
  claims: Claim[];
}

export interface Registry {
  objectives: Record<string, Objective>;
  currentObjectiveId: string | null;
}

export interface TypeCheckResult {
  passed: boolean;
  skipped: boolean;
  reason?: string;
  errorOutput?: string;
}

export interface WorktreeIssue {
  path: string;
  issue: string;
}

export interface PackageIssue {
  file: string;
  message: string;
}

export type ClaimStatus = 'VERIFIED' | 'FALSE' | 'UNSUBSTANTIATED';

export interface ClaimResult {
  claim: Claim;
  status: ClaimStatus;
  details: string;
  duplicate: boolean;
}

export interface AuditResult {
  passed: boolean;
  skipped: boolean;
  reason?: string;
  changedFiles: string[];
  orphans: string[];
  stubs: string[];
  typeCheck: TypeCheckResult;
  worktreeIssues: WorktreeIssue[];
  packageIssues: PackageIssue[];
  claimResults: ClaimResult[];
}
