import * as fs from 'fs';
import * as path from 'path';
import { Dependency, ProjectType } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

export class PackageJsonStrategy implements ParsingStrategy {
  readonly name = 'PackageJsonStrategy';
  priority = 1; // Highest priority for declared dependencies

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'package.json';
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const packageJson = JSON.parse(content);
      const dependencies: Dependency[] = [];

      // Parse production dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'dependency',
            isInstalled: false // Will be determined by other strategies
          });
        }
      }

      // Parse development dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'devDependency',
            isInstalled: false
          });
        }
      }

      // Parse peer dependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'peerDependency',
            isInstalled: false
          });
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing package.json: ${error}`);
      return [];
    }
  }
}
