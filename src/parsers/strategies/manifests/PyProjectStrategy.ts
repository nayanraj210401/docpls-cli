import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface PyProjectDependency {
  version?: string;
  git?: string;
  branch?: string;
  tag?: string;
  path?: string;
}

interface PyProject {
  build_system?: {
    requires?: string[];
    build_backend?: string;
  };
  project?: {
    name?: string;
    version?: string;
    dependencies?: string[];
    optional_dependencies?: { [key: string]: string[] };
  };
  tool?: {
    poetry?: {
      name?: string;
      version?: string;
      description?: string;
      dependencies?: { [key: string]: string };
      dev_dependencies?: { [key: string]: string };
      group?: { [key: string]: { dependencies?: { [key: string]: string } } };
    };
    flit?: {
      metadata?: {
        requires?: { [key: string]: string[] };
        dev_requires?: string[];
      };
    };
    hatch?: {
      build?: {
        dependencies?: string[];
      };
      envs?: {
        default?: {
          dependencies?: string[];
        };
      };
    };
    setuptools?: {
      dependencies?: string[];
    };
  };
}

export class PyProjectStrategy implements ParsingStrategy {
  readonly name = 'PyProjectStrategy';
  priority = 1;

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'pyproject.toml';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const pyProject = this.parseToml(content);
      const dependencies: Dependency[] = [];

      // Parse PEP 621 project dependencies
      if (pyProject.project?.dependencies) {
        for (const dep of pyProject.project.dependencies) {
          const parsed = this.parsePep508Dependency(dep);
          if (parsed) {
            dependencies.push(parsed);
          }
        }
      }

      // Parse optional dependencies
      if (pyProject.project?.optional_dependencies) {
        for (const [group, deps] of Object.entries(pyProject.project.optional_dependencies)) {
          for (const dep of deps) {
            const parsed = this.parsePep508Dependency(dep);
            if (parsed) {
              parsed.type = group === 'dev' || group === 'test' ? 'devDependency' : 'dependency';
              dependencies.push(parsed);
            }
          }
        }
      }

      // Parse Poetry dependencies
      if (pyProject.tool?.poetry?.dependencies) {
        for (const [name, constraint] of Object.entries(pyProject.tool.poetry.dependencies)) {
          if (name !== 'python') { // Skip python version constraint
            dependencies.push({
              name,
              version: constraint,
              resolvedVersion: constraint,
              isInstalled: false, // From manifest, not verified
              type: 'dependency'
            });
          }
        }
      }

      // Parse Poetry dev dependencies
      if (pyProject.tool?.poetry?.dev_dependencies) {
        for (const [name, constraint] of Object.entries(pyProject.tool.poetry.dev_dependencies)) {
          dependencies.push({
            name,
            version: constraint,
            resolvedVersion: constraint,
            isInstalled: false, // From manifest, not verified
            type: 'devDependency'
          });
        }
      }

      // Parse Poetry group dependencies
      if (pyProject.tool?.poetry?.group) {
        for (const [groupName, group] of Object.entries(pyProject.tool.poetry.group)) {
          const isDevGroup = groupName === 'dev' || groupName === 'test';
          if (group.dependencies) {
            for (const [name, constraint] of Object.entries(group.dependencies)) {
              if (name !== 'python') {
                dependencies.push({
                  name,
                  version: constraint,
                  resolvedVersion: constraint,
                  isInstalled: false,
                  type: isDevGroup ? 'devDependency' : 'dependency'
                });
              }
            }
          }
        }
      }

      // Parse Flit dependencies
      if (pyProject.tool?.flit?.metadata?.requires) {
        for (const [key, reqs] of Object.entries(pyProject.tool.flit.metadata.requires)) {
          const isDev = key === 'dev_requires';
          for (const dep of reqs) {
            const parsed = this.parsePep508Dependency(dep);
            if (parsed) {
              parsed.type = isDev ? 'devDependency' : 'dependency';
              dependencies.push(parsed);
            }
          }
        }
      }

      // Parse Hatch dependencies
      if (pyProject.tool?.hatch?.envs?.default?.dependencies) {
        for (const dep of pyProject.tool.hatch.envs.default.dependencies) {
          const parsed = this.parsePep508Dependency(dep);
          if (parsed) {
            dependencies.push(parsed);
          }
        }
      }

      // Parse setuptools dependencies
      if (pyProject.tool?.setuptools?.dependencies) {
        for (const dep of pyProject.tool.setuptools.dependencies) {
          const parsed = this.parsePep508Dependency(dep);
          if (parsed) {
            dependencies.push(parsed);
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing pyproject.toml: ${error}`);
      return [];
    }
  }

  private parsePep508Dependency(dependency: string): Dependency | null {
    // Parse PEP 508 dependency specifications
    // Examples: "requests>=2.28.0", "numpy==1.21.0", "pandas[excel]>=1.3.0"
    
    // Remove extras first (e.g., "pandas[excel]" -> "pandas")
    const withoutExtras = dependency.replace(/\[.*?\]/g, '');
    
    // Parse name and version constraint
    const match = withoutExtras.match(/^([a-zA-Z0-9\-_.]+)\s*([<>=!~]+)\s*(.+)$/);
    if (match) {
      return {
        name: match[1],
        version: match[3],
        resolvedVersion: `${match[2]}${match[3]}`,
        isInstalled: false, // From manifest, not verified
        type: 'dependency'
      };
    }

    // Simple name without version
    if (/^[a-zA-Z0-9\-_.]+$/.test(withoutExtras)) {
      return {
        name: withoutExtras,
        isInstalled: false,
        type: 'dependency'
      };
    }

    return null;
  }

  private parseToml(content: string): PyProject {
    // Simple TOML parser for pyproject.toml
    // This is a basic implementation - for production, use a proper TOML library
    const result: PyProject = {};

    const lines = content.split('\n');
    let currentSection = '';
    let currentPath: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Parse sections
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        currentPath = currentSection.split('.');
        continue;
      }

      // Parse key-value pairs
      if (trimmed.includes(' = ')) {
        const [key, value] = trimmed.split(' = ').map(s => s.trim());
        const cleanValue = value.replace(/"/g, '');

        // Simple assignment (this is a very basic implementation)
        if (currentPath.length === 1) {
          (result as any)[currentPath[0]] = (result as any)[currentPath[0]] || {};
          (result as any)[currentPath[0]][key] = cleanValue;
        }
      }

      // Parse arrays
      if (trimmed.startsWith('-') && currentPath.length > 0) {
        const value = trimmed.substring(1).trim().replace(/"/g, '');
        // This is a simplified array parsing
        // In a real implementation, you'd need proper array management
      }
    }

    return result;
  }
}
