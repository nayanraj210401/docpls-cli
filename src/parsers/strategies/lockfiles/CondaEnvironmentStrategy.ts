import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface CondaEnvironment {
  name: string;
  channels?: string[];
  dependencies: (string | { pip?: string[] })[];
  prefix?: string;
}

export class CondaEnvironmentStrategy implements ParsingStrategy {
  readonly name = 'CondaEnvironmentStrategy';
  priority = 2;

  canHandle(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return fileName === 'environment.yml' || fileName === 'conda.yml';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const dependencies: Dependency[] = [];

      // Simple YAML parsing for conda environment files
      const lines = content.split('\n');
      let inDependencies = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === 'dependencies:') {
          inDependencies = true;
          continue;
        }

        if (inDependencies && trimmed && !trimmed.startsWith('-')) {
          // End of dependencies section
          inDependencies = false;
          continue;
        }

        if (inDependencies && trimmed.startsWith('-')) {
          const dep = trimmed.substring(1).trim();
          
          // Handle pip dependencies
          if (dep.startsWith('pip:')) {
            const pipDeps = dep.substring(4).trim();
            if (pipDeps.startsWith('[') && pipDeps.endsWith(']')) {
              // Parse pip dependencies array
              const pipList = pipDeps.slice(1, -1).split(',').map((d: string) => d.trim().replace(/['"]/g, ''));
              for (const pipDep of pipList) {
                const parsed = this.parseCondaRequirement(pipDep);
                if (parsed) {
                  dependencies.push(parsed);
                }
              }
            }
          } else {
            // Parse conda dependency
            const parsed = this.parseCondaRequirement(dep);
            if (parsed) {
              dependencies.push(parsed);
            }
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing conda environment file: ${error}`);
      return [];
    }
  }

  private parseCondaRequirement(requirement: string): Dependency | null {
    // Parse conda requirement formats like:
    // "numpy>=1.20.0", "pandas==1.3.0", "scipy", "python=3.9"
    
    const match = requirement.match(/^([a-zA-Z0-9\-_.]+)([<>=!]+)(.+)$/);
    if (match) {
      return {
        name: match[1],
        version: match[3],
        resolvedVersion: `${match[2]}${match[3]}`,
        isInstalled: true,
        type: 'dependency'
      };
    }

    // Simple name without version
    if (/^[a-zA-Z0-9\-_.]+$/.test(requirement)) {
      return {
        name: requirement,
        isInstalled: true,
        type: 'dependency'
      };
    }

    return null;
  }
}
