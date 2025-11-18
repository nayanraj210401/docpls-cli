import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface YarnLockEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: { [key: string]: string };
}

export class YarnLockStrategy implements ParsingStrategy {
  readonly name = 'YarnLockStrategy';
  priority = 2;

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'yarn.lock';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entries = this.parseYarnLockContent(content);
      const dependencies: Dependency[] = [];

      for (const [name, entry] of entries) {
        dependencies.push({
          name,
          resolvedVersion: entry.version,
          isInstalled: true,
          type: 'dependency' // Yarn doesn't distinguish dev/prod in lock file
        });
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing yarn.lock: ${error}`);
      return [];
    }
  }

  private parseYarnLockContent(content: string): Map<string, YarnLockEntry> {
    const entries = new Map<string, YarnLockEntry>();
    const lines = content.split('\n');
    let currentEntry: Partial<YarnLockEntry> = {};
    let currentName = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;

      // Package name line (ends with ':')
      if (line.endsWith(':') && !line.startsWith(' ')) {
        if (currentName && currentEntry.version) {
          entries.set(currentName, currentEntry as YarnLockEntry);
        }
        
        currentName = line.slice(0, -1);
        currentEntry = {};
        continue;
      }

      // Property line (indented)
      if (line.startsWith(' ') && currentName) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim().replace(/"/g, '');
          
          if (key === 'version') {
            currentEntry.version = value;
          } else if (key === 'resolved') {
            currentEntry.resolved = value;
          } else if (key === 'integrity') {
            currentEntry.integrity = value;
          }
        }
      }
    }

    // Add last entry
    if (currentName && currentEntry.version) {
      entries.set(currentName, currentEntry as YarnLockEntry);
    }

    return entries;
  }
}
