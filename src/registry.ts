import * as fs from 'fs';
import * as path from 'path';
import { Registry, Objective } from './types';

export class RegistryManager {
  private registryDir: string;
  private registryFile: string;

  constructor(cwd: string) {
    this.registryDir = path.join(cwd, '.shield');
    this.registryFile = path.join(this.registryDir, 'registry.json');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.registryDir)) {
      fs.mkdirSync(this.registryDir, { recursive: true });
    }
  }

  private emptyRegistry(): Registry {
    return { objectives: {}, currentObjectiveId: null };
  }

  load(): Registry {
    if (!fs.existsSync(this.registryFile)) return this.emptyRegistry();
    try {
      return JSON.parse(fs.readFileSync(this.registryFile, 'utf-8'));
    } catch {
      return this.emptyRegistry();
    }
  }

  save(reg: Registry): void {
    this.ensureDir();
    fs.writeFileSync(this.registryFile, JSON.stringify(reg, null, 2));
  }

  addObjective(obj: Objective): void {
    const reg = this.load();
    reg.objectives[obj.id] = obj;
    reg.currentObjectiveId = obj.id;
    this.save(reg);
  }

  getCurrent(): Objective | null {
    const reg = this.load();
    if (!reg.currentObjectiveId) return null;
    return reg.objectives[reg.currentObjectiveId] || null;
  }

  list(): Objective[] {
    const reg = this.load();
    return Object.values(reg.objectives);
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
