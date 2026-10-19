export interface ShieldConfig {
  entrypointPatterns: string[];
  stubMarkers: string[];
  ignorePatterns: string[];
  enableTypeCheck: boolean;
  tsconfigPath: string;
}

export interface Objective {
  id: string;
  goal: string;
  startTime: string;
  branch: string;
  startCommit: string;
  scope: string[];
  status: 'active' | 'completed';
}

export interface Registry {
  objectives: Record<string, Objective>;
  currentObjectiveId: string | null;
}
