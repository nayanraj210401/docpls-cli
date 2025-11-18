import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetector, ProjectType } from '../types';

export class NodeDetector implements ProjectDetector {
  detect(projectPath: string): ProjectType | null {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Basic validation that it's actually a Node.js project
      if (typeof packageJson === 'object' && packageJson !== null) {
        return ProjectType.NODE;
      }
    } catch (error) {
      return null;
    }
    
    return null;
  }
  
  getManifestFiles(): string[] {
    return ['package.json'];
  }
  
  getLockFiles(): string[] {
    return ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  }
}
