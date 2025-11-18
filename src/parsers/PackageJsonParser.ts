import * as fs from 'fs';
import * as path from 'path';
import { DependencyParser, Dependency, NodeModulesResolver } from '../types';
import { NodeModulesResolverImpl } from './NodeModulesResolver';

export class PackageJsonParser implements DependencyParser {
  private resolver: NodeModulesResolver;

  constructor() {
    this.resolver = new NodeModulesResolverImpl();
  }

  parse(filePath: string): Dependency[] {
    try {
      const projectPath = path.dirname(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const packageJson = JSON.parse(content);
      const dependencies: Dependency[] = [];
      
      // Parse production dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          const resolved = this.resolver.resolveDependency(name, projectPath);
          if (resolved) {
            dependencies.push({
              ...resolved,
              version: version as string,
              type: 'dependency'
            });
          }
        }
      }
      
      // Parse dev dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          const resolved = this.resolver.resolveDependency(name, projectPath);
          if (resolved) {
            dependencies.push({
              ...resolved,
              version: version as string,
              type: 'devDependency'
            });
          }
        }
      }
      
      // Parse peer dependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          const resolved = this.resolver.resolveDependency(name, projectPath);
          if (resolved) {
            dependencies.push({
              ...resolved,
              version: version as string,
              type: 'peerDependency'
            });
          }
        }
      }
      
      return dependencies;
    } catch (error) {
      console.error(`Error parsing package.json: ${error}`);
      return [];
    }
  }
  
  supports(fileType: string): boolean {
    return fileType === 'package.json';
  }

  // Enhanced method to parse with lock file information
  parseWithLockFile(packageJsonPath: string, lockFiles: string[]): Dependency[] {
    const dependencies = this.parse(packageJsonPath);
    const projectPath = path.dirname(packageJsonPath);
    
    // Merge information from lock files
    for (const lockFile of lockFiles) {
      const lockFilePath = path.join(projectPath, lockFile);
      if (fs.existsSync(lockFilePath)) {
        const lockDependencies = this.resolver.parseLockFile(lockFilePath);
        
        // Update dependencies with lock file information
        for (const dep of dependencies) {
          const lockVersion = lockDependencies.get(dep.name);
          if (lockVersion && !dep.resolvedVersion) {
            dep.resolvedVersion = lockVersion;
          }
        }
      }
    }
    
    return dependencies;
  }

  // Method to detect if this is a mono-repo
  isMonoRepo(packageJsonPath: string): boolean {
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      // Check for workspaces field
      if (packageJson.workspaces) {
        return true;
      }
      
      // Check for multiple package.json files in the project
      const projectPath = path.dirname(packageJsonPath);
      const packageJsonFiles = this.findPackageJsonFiles(projectPath);
      return packageJsonFiles.length > 1;
    } catch (error) {
      return false;
    }
  }

  // Find all package.json files in the project (excluding node_modules)
  private findPackageJsonFiles(projectPath: string): string[] {
    const files: string[] = [];
    
    try {
      this.scanDirectory(projectPath, files, new Set(['node_modules', 'dist', 'build']));
    } catch (error) {
      console.error('Error scanning for package.json files:', error);
    }
    
    return files;
  }

  private scanDirectory(dir: string, files: string[], excludeDirs: Set<string>): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!excludeDirs.has(entry.name)) {
            this.scanDirectory(fullPath, files, excludeDirs);
          }
        } else if (entry.name === 'package.json') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors, etc.
    }
  }

  // Get all dependencies from all package.json files in a mono-repo
  getAllDependencies(projectPath: string): Dependency[] {
    const packageJsonFiles = this.findPackageJsonFiles(projectPath);
    const allDependencies = new Map<string, Dependency>();
    
    for (const packageJsonPath of packageJsonFiles) {
      const dependencies = this.parse(packageJsonPath);
      
      for (const dep of dependencies) {
        // Prefer production dependencies over dev dependencies
        const existing = allDependencies.get(dep.name);
        if (!existing || (existing.type === 'devDependency' && dep.type === 'dependency')) {
          allDependencies.set(dep.name, dep);
        }
      }
    }
    
    return Array.from(allDependencies.values());
  }
}
