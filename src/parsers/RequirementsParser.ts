import * as fs from 'fs';
import { DependencyParser, Dependency } from '../types';

export class RequirementsParser implements DependencyParser {
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
        // Examples: requests==2.28.1, numpy>=1.20.0, django~=4.1.0
        const match = trimmedLine.match(/^([a-zA-Z0-9\-_.]+)([><=!~]+.*)?$/);
        if (match) {
          const name = match[1];
          const version = match[2] || undefined;
          
          dependencies.push({
            name,
            version,
            type: 'dependency'
          });
        }
      }
      
      return dependencies;
    } catch (error) {
      console.error(`Error parsing requirements.txt: ${error}`);
      return [];
    }
  }
  
  supports(fileType: string): boolean {
    return fileType === 'requirements.txt' || fileType === 'requirements-dev.txt';
  }
}
