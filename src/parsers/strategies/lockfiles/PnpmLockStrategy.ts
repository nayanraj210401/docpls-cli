import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface PnpmLockEntry {
  version: string;
  resolution?: string;
  integrity?: string;
  dependencies?: { [key: string]: string };
}

type PnpmImporter = {
  dependencies?: { [key: string]: PnpmLockEntry };
  devDependencies?: { [key: string]: PnpmLockEntry };
};

interface PnpmLockYaml {
  lockfileVersion: string;
  dependencies?: { [key: string]: PnpmLockEntry };
  devDependencies?: { [key: string]: PnpmLockEntry };
  packages?: { [key: string]: PnpmLockEntry };
  importers?: { [key: string]: PnpmImporter };
}

export class PnpmLockStrategy implements ParsingStrategy {
  readonly name = 'PnpmLockStrategy';
  priority = 2;

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'pnpm-lock.yaml';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const dependencies: Dependency[] = [];

      // Simple YAML parsing for pnpm-lock.yaml
      const lockData = this.parsePnpmLockYaml(content);

      // Handle new pnpm lockfile format (lockfileVersion '9.0') with importers
      if (lockData.importers && lockData.importers['.']) {
        const importer = lockData.importers['.'];
        
        // Parse dependencies from importers section
        if (importer.dependencies) {
          for (const [name, entry] of Object.entries(importer.dependencies)) {
            dependencies.push({
              name,
              version: entry.version,
              resolvedVersion: entry.version,
              type: 'dependency'
            });
          }
        }

        // Parse dev dependencies from importers section
        if (importer.devDependencies) {
          for (const [name, entry] of Object.entries(importer.devDependencies)) {
            dependencies.push({
              name,
              version: entry.version,
              resolvedVersion: entry.version,
              type: 'devDependency'
            });
          }
        }
      }

      // Fallback to old format for backward compatibility
      if (dependencies.length === 0) {
        // Parse dependencies
        if (lockData.dependencies) {
          for (const [name, entry] of Object.entries(lockData.dependencies)) {
            dependencies.push({
              name,
              version: entry.version,
              resolvedVersion: entry.version,
              type: 'dependency'
            });
          }
        }

        // Parse dev dependencies
        if (lockData.devDependencies) {
          for (const [name, entry] of Object.entries(lockData.devDependencies)) {
            dependencies.push({
              name,
              version: entry.version,
              resolvedVersion: entry.version,
              type: 'devDependency'
            });
          }
        }
      }

      // Parse packages (transitive dependencies)
      if (lockData.packages) {
        for (const [pkgKey, entry] of Object.entries(lockData.packages)) {
          // Extract package name from key like "@cspotcode/source-map-support@0.8.1"
          // or "commander@11.1.0"
          let name: string;
          const lastAt = pkgKey.lastIndexOf('@');
          
          // Handle scoped packages properly
          if (pkgKey.startsWith('@')) {
            // For scoped packages, find the last @ which separates name from version
            const match = pkgKey.match(/^(@[^\/]+\/[^@]+)@/);
            if (match) {
              name = match[1];
            } else {
              // Fallback for edge cases
              const parts = pkgKey.split('@');
              if (parts.length >= 3) {
                // Scoped package: @scope/name@version
                name = `@${parts[1]}/${parts[2].split('/')[0]}`;
              } else {
                name = pkgKey;
              }
            }
          } else {
            // Regular package: name@version
            if (lastAt > 0) {
              name = pkgKey.substring(0, lastAt);
            } else {
              name = pkgKey;
            }
          }
          
          // Only add if not already present
          if (!dependencies.find(d => d.name === name)) {
            dependencies.push({
              name,
              resolvedVersion: entry.version,
              isInstalled: true,
              type: 'dependency' // Transitive deps default to production
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing pnpm-lock.yaml: ${error}`);
      return [];
    }
  }

  private parsePnpmLockYaml(content: string): PnpmLockYaml {
    // Simple YAML parser - just extract dependencies and devDependencies sections
    const result: PnpmLockYaml = {
      lockfileVersion: '',
      dependencies: {},
      devDependencies: {},
      packages: {},
      importers: {}
    };

    const lines = content.split('\n');
    let currentSection = '';
    let currentSubsection = '';
    let indentLevel = 0;
    let currentImporter: string | null = null;
    let lastIndentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineIndent = line.length - line.trimStart().length;

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle subsections within importers (dependencies:, devDependencies:) BEFORE checking for sections
      if (currentSection === 'importers' && currentImporter) {
        if (trimmed === 'dependencies:' || trimmed === 'devDependencies:') {
          if (lineIndent > lastIndentLevel) {
            currentSubsection = trimmed.slice(0, -1);
            lastIndentLevel = lineIndent;
            continue;
          }
        }
      }

      // Detect sections (but not if we're in importers with an importer set)
      if (!(currentSection === 'importers' && currentImporter)) {
        if (trimmed === 'dependencies:') {
          currentSection = 'dependencies';
          currentSubsection = '';
          indentLevel = lineIndent;
          currentImporter = null;
          lastIndentLevel = lineIndent;
          continue;
        } else if (trimmed === 'devDependencies:') {
          currentSection = 'devDependencies';
          currentSubsection = '';
          indentLevel = lineIndent;
          currentImporter = null;
          lastIndentLevel = lineIndent;
          continue;
        } else if (trimmed === 'packages:') {
          currentSection = 'packages';
          currentSubsection = '';
          indentLevel = lineIndent;
          currentImporter = null;
          lastIndentLevel = lineIndent;
          continue;
        } else if (trimmed === 'importers:') {
          currentSection = 'importers';
          currentSubsection = '';
          indentLevel = lineIndent;
          currentImporter = null;
          lastIndentLevel = lineIndent;
          continue;
        }
      }

      if (trimmed === 'lockfileVersion:') {
        // Extract lockfile version
        const versionLine = lines[i + 1];
        if (versionLine) {
          result.lockfileVersion = versionLine.trim().replace(/['"]/g, '');
        }
        continue;
      }

      // Handle importer keys (e.g., '.:')
      if (currentSection === 'importers' && trimmed === '.:') {
        currentImporter = trimmed.slice(0, -1);
        lastIndentLevel = lineIndent;
        // Don't continue here - we need to process the next line which might be a subsection
      }

      // Handle subsections within importers (dependencies:, devDependencies:)
      if (currentSection === 'importers' && currentImporter) {
        if (trimmed === 'dependencies:' || trimmed === 'devDependencies:') {
          if (lineIndent > lastIndentLevel) {
            currentSubsection = trimmed.slice(0, -1);
            lastIndentLevel = lineIndent;
            continue;
          }
        }
      }

      // Parse package entries in current section
      if (trimmed.includes(':') && trimmed !== 'dependencies:' && trimmed !== 'devDependencies:') {
        const [name, version] = trimmed.split(':').map(s => s.trim());
        const cleanVersion = version.replace(/['"]/g, '');
        
        // Only parse if this is an indented entry (not a new section)
        if (lineIndent > lastIndentLevel) {
          if (currentSection === 'importers' && currentImporter && currentSubsection) {
            // Skip specifier entries, only parse version entries
            if (name === 'specifier') {
              continue;
            }
            
            // For version entries, we need to get the dependency name from the previous line
            if (name === 'version') {
              // Look back to find the dependency name
              let depName = '';
              for (let j = i - 1; j >= 0; j--) {
                const prevLine = lines[j];
                const prevTrimmed = prevLine.trim();
                const prevIndent = prevLine.length - prevLine.trimStart().length;
                
                // Find the line with the dependency name (indent less than current, ends with ':')
                if (prevIndent < lineIndent && prevTrimmed.endsWith(':') && prevTrimmed !== 'version:' && prevTrimmed !== 'dependencies:' && prevTrimmed !== 'devDependencies:') {
                  depName = prevTrimmed.slice(0, -1).replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1");
                  break;
                }
              }
              
              if (depName) {
                // Parse dependencies/devDependencies within importers
                if (!result.importers) {
                  result.importers = {};
                }
                if (!result.importers[currentImporter]) {
                  result.importers[currentImporter] = { dependencies: {}, devDependencies: {} };
                }
                if (currentSubsection === 'dependencies') {
                  if (!result.importers[currentImporter].dependencies) {
                    result.importers[currentImporter].dependencies = {};
                  }
                  const deps = result.importers[currentImporter].dependencies!;
                  deps[depName] = { version: cleanVersion };
                } else if (currentSubsection === 'devDependencies') {
                  if (!result.importers[currentImporter].devDependencies) {
                    result.importers[currentImporter].devDependencies = {};
                  }
                  const deps = result.importers[currentImporter].devDependencies!;
                  deps[depName] = { version: cleanVersion };
                }
              }
            }
          } else if (currentSection === 'dependencies') {
            if (!result.dependencies) {
              result.dependencies = {};
            }
            result.dependencies[name] = { version: cleanVersion };
          } else if (currentSection === 'devDependencies') {
            if (!result.devDependencies) {
              result.devDependencies = {};
            }
            result.devDependencies[name] = { version: cleanVersion };
          } else if (currentSection === 'packages') {
            if (!result.packages) {
              result.packages = {};
            }
            result.packages[name] = { version: cleanVersion };
          }
        }
      }
    }

    return result;
  }
}
