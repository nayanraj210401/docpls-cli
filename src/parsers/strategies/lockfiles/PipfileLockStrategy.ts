import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface PipfileLockEntry {
  version: string;
  hashes?: string[];
  index?: string;
  git?: string;
  ref?: string;
  subdirectory?: string;
}

interface PipfileLock {
  _meta: {
    requires: { python_version: string };
    pipfile_spec: number;
    hash: { [key: string]: string };
  };
  default: { [key: string]: PipfileLockEntry };
  develop: { [key: string]: PipfileLockEntry };
}

export class PipfileLockStrategy implements ParsingStrategy {
  readonly name = 'PipfileLockStrategy';
  priority = 2;

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'Pipfile.lock';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const pipfileLock: PipfileLock = JSON.parse(content);
      const dependencies: Dependency[] = [];

      // Parse default (production) dependencies
      if (pipfileLock.default) {
        for (const [name, entry] of Object.entries(pipfileLock.default)) {
          dependencies.push({
            name,
            version: this.extractVersion(entry.version),
            resolvedVersion: entry.version,
            isInstalled: true,
            type: 'dependency'
          });
        }
      }

      // Parse develop (development) dependencies
      if (pipfileLock.develop) {
        for (const [name, entry] of Object.entries(pipfileLock.develop)) {
          dependencies.push({
            name,
            version: this.extractVersion(entry.version),
            resolvedVersion: entry.version,
            isInstalled: true,
            type: 'devDependency'
          });
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing Pipfile.lock: ${error}`);
      return [];
    }
  }

  private extractVersion(version: string): string {
    // Extract version from formats like "==1.2.3", ">=1.2.3", etc.
    const match = version.match(/([<>=!~]*)([^;]+)/);
    if (match) {
      return match[2].trim();
    }
    return version;
  }
}
