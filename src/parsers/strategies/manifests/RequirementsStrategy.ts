import * as fs from 'fs';
import * as path from 'path';
import { Dependency, ProjectType } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

export class RequirementsStrategy implements ParsingStrategy {
  readonly name = 'RequirementsStrategy';
  priority = 1;

  canHandle(filePath: string): boolean {
    const filename = path.basename(filePath);
    return ['requirements.txt', 'requirements-dev.txt', 'requirements.pip'].includes(filename);
  }

  parse(filePath: string): Dependency[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const dependencies: Dependency[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        // Parse requirement line
        const match = trimmedLine.match(/^([a-zA-Z0-9\-_.]+)([><=!]+.*)?$/);
        if (match) {
          const name = match[1];
          const version = match[2] || undefined;
          
          dependencies.push({
            name,
            version,
            type: 'dependency',
            isInstalled: false
          });
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error parsing requirements file: ${error}`);
      return [];
    }
  }
}
