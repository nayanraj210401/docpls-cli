import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetector, ProjectType } from '../types';

export class PythonDetector implements ProjectDetector {
  detect(projectPath: string): ProjectType | null {
    const pythonFiles = [
      'requirements.txt',
      'pyproject.toml',
      'setup.py',
      'Pipfile',
      'poetry.lock'
    ];
    
    for (const file of pythonFiles) {
      const filePath = path.join(projectPath, file);
      if (fs.existsSync(filePath)) {
        return ProjectType.PYTHON;
      }
    }
    
    return null;
  }
  
  getManifestFiles(): string[] {
    return [
      'pyproject.toml', 
      'setup.py', 
      'setup.cfg', 
      'Pipfile',
      'requirements.in',
      'requirements-dev.in'
    ];
  }
  
  getLockFiles(): string[] {
    return [
      'requirements.txt',
      'requirements-dev.txt',
      'poetry.lock', 
      'Pipfile.lock',
      'environment.yml',
      'conda.yml',
      'pip.lock'
    ];
  }
}
