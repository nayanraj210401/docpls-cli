import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface PoetryLockPackage {
  name: string;
  version: string;
  category?: 'main' | 'dev';
  optional?: boolean;
  pythonVersions?: string;
  dependencies?: { [key: string]: string };
  source?: {
    type: 'git' | 'url' | 'file';
    url?: string;
    reference?: string;
    resolvedReference?: string;
  };
}

interface PoetryLock {
  lock_version: string;
  package: PoetryLockPackage[];
  metadata: {
    lock_version: string;
    python_versions?: string;
    content_hash: string;
  };
}

export class PoetryLockStrategy implements ParsingStrategy {
  readonly name = 'PoetryLockStrategy';
  priority = 2;

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'poetry.lock';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const poetryLock: PoetryLock = this.parseToml(content);
      const dependencies: Dependency[] = [];

      if (poetryLock.package) {
        for (const pkg of poetryLock.package) {
          dependencies.push({
            name: pkg.name,
            version: pkg.version,
            resolvedVersion: pkg.version,
            isInstalled: true,
            type: pkg.category === 'dev' ? 'devDependency' : 'dependency'
          });
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing poetry.lock: ${error}`);
      return [];
    }
  }

  private parseToml(content: string): PoetryLock {
    // Simple TOML parser for poetry.lock
    // This is a basic implementation - for production, use a proper TOML library
    const result: PoetryLock = {
      lock_version: '',
      package: [],
      metadata: {
        lock_version: '',
        content_hash: ''
      }
    };

    const lines = content.split('\n');
    let currentSection = '';
    let currentPackage: Partial<PoetryLockPackage> = {};
    let inPackageArray = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;

      // Parse package array entries first (before regular sections)
      if (line === '[[package]]') {
        if (currentPackage.name) {
          // Save previous package
          result.package.push(currentPackage as PoetryLockPackage);
        }
        currentPackage = {};
        inPackageArray = true;
        continue;
      }

      // Parse sections
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1);
        inPackageArray = currentSection === 'package' || currentSection.startsWith('package');
        continue;
      }

      // Parse package entries
      if (inPackageArray && line.includes(' = ')) {
        const [key, value] = line.split(' = ').map(s => s.trim());
        const cleanValue = value.replace(/"/g, '');

        if (key === 'name') {
          if (currentPackage.name) {
            // Save previous package
            result.package.push(currentPackage as PoetryLockPackage);
          }
          currentPackage = { name: cleanValue };
        } else if (key === 'version') {
          currentPackage.version = cleanValue;
        } else if (key === 'category') {
          currentPackage.category = cleanValue as 'main' | 'dev';
        } else if (key === 'optional') {
          currentPackage.optional = cleanValue === 'true';
        }
      }
    }

    // Add last package
    if (currentPackage.name) {
      result.package.push(currentPackage as PoetryLockPackage);
    }

    return result;
  }
}
