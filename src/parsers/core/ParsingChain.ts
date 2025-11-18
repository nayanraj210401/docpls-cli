import * as fs from 'fs';
import * as path from 'path';
import { Dependency, ProjectType } from '../../types';
import { ParsingStrategy } from '../strategies/ParsingStrategy';

export class ParsingChain {
  private strategies: ParsingStrategy[] = [];

  /**
   * Add a parsing strategy to the chain
   */
  addStrategy(strategy: ParsingStrategy): void {
    this.strategies.push(strategy);
    // Sort by priority (higher priority first)
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Parse a project directory using all applicable strategies
   */
  async parseProject(projectPath: string, projectType: ProjectType): Promise<Dependency[]> {
    const dependencyMap = new Map<string, Dependency>();

    // Get all relevant files in the project
    const files = this.getProjectFiles(projectPath, projectType);

    // Apply each strategy that can handle the file
    for (const strategy of this.strategies) {
      for (const file of files) {
        if (strategy.canHandle(file)) {
          try {
            const dependencies = await strategy.parse(file);
            this.mergeDependencies(dependencyMap, dependencies, strategy.priority);
          } catch (error) {
            console.error(`Error in ${strategy.name} for ${file}:`, error);
          }
        }
      }
    }

    return Array.from(dependencyMap.values());
  }

  /**
   * Get all relevant files for a project type
   */
  private getProjectFiles(projectPath: string, projectType: ProjectType): string[] {
    const files: string[] = [];

    if (projectType === ProjectType.NODE) {
      // Manifest files
      const packageJson = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJson)) files.push(packageJson);

      // Lock files
      const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
      for (const lockFile of lockFiles) {
        const lockPath = path.join(projectPath, lockFile);
        if (fs.existsSync(lockPath)) files.push(lockPath);
      }

      // Node modules directory
      const nodeModules = path.join(projectPath, 'node_modules');
      if (fs.existsSync(nodeModules)) files.push(nodeModules);
    }

    if (projectType === ProjectType.PYTHON) {
      // Python manifest files
      const pythonFiles = [
        'requirements.txt',
        'requirements-dev.txt',
        'requirements.pip',
        'setup.py',
        'pyproject.toml',
        'Pipfile'
      ];
      
      for (const pythonFile of pythonFiles) {
        const filePath = path.join(projectPath, pythonFile);
        if (fs.existsSync(filePath)) files.push(filePath);
      }

      // Python lock files
      const pythonLockFiles = [
        'poetry.lock',
        'Pipfile.lock',
        'environment.yml',
        'conda.yml',
        'pip.lock'
      ];
      
      for (const lockFile of pythonLockFiles) {
        const filePath = path.join(projectPath, lockFile);
        if (fs.existsSync(filePath)) files.push(filePath);
      }

      // Look for virtual environments
      const venvDirs = this.findVirtualEnvironments(projectPath);
      files.push(...venvDirs);
    }

    return files;
  }

  /**
   * Find virtual environments in a Python project
   */
  private findVirtualEnvironments(projectPath: string): string[] {
    const venvPaths: string[] = [];
    
    // Common virtual environment directory names
    const commonVenvNames = [
      '.venv',
      'venv', 
      'env',
      '.env',
      'virtualenv',
      'conda-env',
      '.python-virtualenv',
      '.virtualenv'
    ];

    // Check for common virtual environment directories
    for (const venvName of commonVenvNames) {
      const venvPath = path.join(projectPath, venvName);
      if (fs.existsSync(venvPath) && fs.statSync(venvPath).isDirectory()) {
        // Check if this looks like a virtual environment
        if (this.isVirtualEnvironment(venvPath)) {
          venvPaths.push(venvPath);
        }
      }
    }

    // Also check for hidden directories that might be virtual environments
    try {
      const items = fs.readdirSync(projectPath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && item.name.startsWith('.') && !commonVenvNames.includes(item.name)) {
          const itemPath = path.join(projectPath, item.name);
          if (this.isVirtualEnvironment(itemPath)) {
            venvPaths.push(itemPath);
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return venvPaths;
  }

  /**
   * Check if a directory is a virtual environment
   */
  private isVirtualEnvironment(dirPath: string): boolean {
    const venvIndicators = [
      'pyvenv.cfg',           // Standard venv
      'conda-meta',           // Conda environment
      'Pipfile.lock',         // Pipenv environment
      '.python-version',      // pyenv/Python version file
      'bin/activate',         // Unix virtualenv
      'Scripts/activate',     // Windows virtualenv
      'bin/python',           // Unix Python executable
      'Scripts/python.exe'    // Windows Python executable
    ];
    
    for (const indicator of venvIndicators) {
      if (fs.existsSync(path.join(dirPath, indicator))) {
        return true;
      }
    }
    
    // Check directory structure
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const hasBin = items.some(item => 
        (item.name === 'bin' || item.name === 'Scripts') && item.isDirectory()
      );
      const hasLib = items.some(item => 
        item.name.startsWith('lib') && item.isDirectory()
      );
      
      return hasBin && hasLib;
    } catch {
      return false;
    }
  }

  /**
   * Merge dependencies with priority handling
   */
  private mergeDependencies(
    existing: Map<string, Dependency>,
    newDeps: Dependency[],
    priority: number
  ): void {
    for (const newDep of newDeps) {
      const existingDep = existing.get(newDep.name);
      
      if (!existingDep) {
        // New dependency, add it
        existing.set(newDep.name, { ...newDep });
      } else {
        // Merge with existing, preferring higher priority data
        const merged = { ...existingDep };
        
        // Update with new data if this strategy has higher priority
        // or if existing data is missing
        if (newDep.resolvedVersion && !existingDep.resolvedVersion) {
          merged.resolvedVersion = newDep.resolvedVersion;
        }
        
        if (newDep.isInstalled !== undefined && existingDep.isInstalled === undefined) {
          merged.isInstalled = newDep.isInstalled;
        }
        
        if (newDep.location && !existingDep.location) {
          merged.location = newDep.location;
        }
        
        if (newDep.hasTypes !== undefined) {
          merged.hasTypes = newDep.hasTypes;
        }
        
        if (newDep.typesLocation && !existingDep.typesLocation) {
          merged.typesLocation = newDep.typesLocation;
        }
        
        if (newDep.docsUrl && !existingDep.docsUrl) {
          merged.docsUrl = newDep.docsUrl;
        }
        
        if (newDep.homepage && !existingDep.homepage) {
          merged.homepage = newDep.homepage;
        }
        
        if (newDep.repository && !existingDep.repository) {
          merged.repository = newDep.repository;
        }
        
        if (newDep.isPrivate !== undefined) {
          merged.isPrivate = newDep.isPrivate;
        }
        
        // Keep the original type from manifest files (higher priority)
        if (priority === 1) { // Manifest files have priority 1
          merged.type = newDep.type;
        }

        existing.set(newDep.name, merged);
      }
    }
  }
}
