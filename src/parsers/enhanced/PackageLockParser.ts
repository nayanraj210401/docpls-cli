import * as fs from 'fs';
import { Dependency } from '../../types';

interface PackageLockEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  requires?: { [key: string]: string };
  dependencies?: { [key: string]: PackageLockEntry };
}

interface PackageLockJson {
  name: string;
  version: string;
  lockfileVersion: number;
  requires?: boolean;
  packages?: { [key: string]: PackageLockEntry };
  dependencies?: { [key: string]: PackageLockEntry };
}

export class PackageLockParser {
  parse(filePath: string): Map<string, Dependency> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const packageLock: PackageLockJson = JSON.parse(content);
      const dependencies = new Map<string, Dependency>();

      // Handle both old and new npm lock file formats
      const packages = packageLock.packages || packageLock.dependencies || {};

      for (const [name, entry] of Object.entries(packages)) {
        // Skip the root package entry
        if (name === '') continue;

        const depName = name.startsWith('node_modules/') 
          ? name.replace(/^node_modules\//, '').split('/').pop() || name
          : name;

        dependencies.set(depName, {
          name: depName,
          resolvedVersion: entry.version,
          isInstalled: true,
          type: entry.dev ? 'devDependency' : 'dependency'
        });
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing package-lock.json: ${error}`);
      return new Map();
    }
  }
}
