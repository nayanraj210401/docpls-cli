import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../types';
import { DocumentationUrlBuilder, UrlValidator } from '../../utils/UrlValidator';

export class NodeModulesAnalyzer {
  analyzeNodeModules(projectPath: string): Map<string, Dependency> {
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    const dependencies = new Map<string, Dependency>();

    if (!fs.existsSync(nodeModulesPath)) {
      return dependencies;
    }

    // This needs to be async now, but for backward compatibility we'll keep it sync
    // and use a simplified version without URL validation for now
    const items = fs.readdirSync(nodeModulesPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        // Handle scoped packages
        if (item.name.startsWith('@')) {
          const scopedPath = path.join(nodeModulesPath, item.name);
          try {
            const scopedItems = fs.readdirSync(scopedPath, { withFileTypes: true });
            for (const scopedItem of scopedItems) {
              if (scopedItem.isDirectory()) {
                const dep = this.analyzeDependencySync(nodeModulesPath, path.join(item.name, scopedItem.name));
                if (dep) {
                  dependencies.set(dep.name, dep);
                }
              }
            }
          } catch (error) {
            console.error(`Error reading scoped directory ${item.name}: ${error}`);
          }
        } else {
          const dep = this.analyzeDependencySync(nodeModulesPath, item.name);
          if (dep) {
            dependencies.set(dep.name, dep);
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Async version with full URL validation
   */
  async analyzeNodeModulesAsync(projectPath: string): Promise<Map<string, Dependency>> {
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    const dependencies = new Map<string, Dependency>();

    if (!fs.existsSync(nodeModulesPath)) {
      return dependencies;
    }

    const items = fs.readdirSync(nodeModulesPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        // Handle scoped packages
        if (item.name.startsWith('@')) {
          const scopedPath = path.join(nodeModulesPath, item.name);
          try {
            const scopedItems = fs.readdirSync(scopedPath, { withFileTypes: true });
            for (const scopedItem of scopedItems) {
              if (scopedItem.isDirectory()) {
                const dep = await this.analyzeDependency(nodeModulesPath, path.join(item.name, scopedItem.name));
                if (dep) {
                  dependencies.set(dep.name, dep);
                }
              }
            }
          } catch (error) {
            console.error(`Error reading scoped directory ${item.name}: ${error}`);
          }
        } else {
          const dep = await this.analyzeDependency(nodeModulesPath, item.name);
          if (dep) {
            dependencies.set(dep.name, dep);
          }
        }
      }
    }

    return dependencies;
  }

  private analyzeDependencySync(nodeModulesPath: string, depName: string): Dependency | null {
    const depPath = path.join(nodeModulesPath, depName);
    
    try {
      // Read the dependency's package.json
      const packageJsonPath = path.join(depPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Find TypeScript definitions
      const typeInfo = this.findTypeDefinitions(depPath);
      
      // Extract metadata using simplified approach for sync version
      const docsUrl = this.extractDocumentationUrl(packageJson);
      const homepage = packageJson.homepage;
      const repository = this.extractRepositoryUrl(packageJson);

      return {
        name: depName,
        resolvedVersion: packageJson.version,
        isInstalled: true,
        location: depPath,
        hasTypes: typeInfo.hasTypes,
        typesLocation: typeInfo.location,
        docsUrl,
        homepage,
        repository,
        isPrivate: packageJson.private || false,
        type: 'dependency' // Will be updated by manifest parser
      };
    } catch (error) {
      console.error(`Error analyzing dependency ${depName}: ${error}`);
      return null;
    }
  }

  private async analyzeDependency(nodeModulesPath: string, depName: string): Promise<Dependency | null> {
    const depPath = path.join(nodeModulesPath, depName);
    
    try {
      // Read the dependency's package.json
      const packageJsonPath = path.join(depPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Find TypeScript definitions
      const typeInfo = this.findTypeDefinitions(depPath);
      
      // Extract metadata using the new URL validation system
      const docsUrlResult = await DocumentationUrlBuilder.buildDocumentationUrls(packageJson);
      const docsUrl = docsUrlResult?.url;
      const homepage = packageJson.homepage;
      const repository = this.extractRepositoryUrl(packageJson);

      return {
        name: depName,
        resolvedVersion: packageJson.version,
        isInstalled: true,
        location: depPath,
        hasTypes: typeInfo.hasTypes,
        typesLocation: typeInfo.location,
        docsUrl,
        homepage,
        repository,
        isPrivate: packageJson.private || false,
        type: 'dependency' // Will be updated by manifest parser
      };
    } catch (error) {
      console.error(`Error analyzing dependency ${depName}: ${error}`);
      return null;
    }
  }

  private findTypeDefinitions(depPath: string): { hasTypes: boolean; location?: string } {
    const typeFiles = [
      'index.d.ts',
      'types.d.ts',
      'main.d.ts'
    ];

    // Check for .d.ts files in root
    for (const typeFile of typeFiles) {
      const typeFilePath = path.join(depPath, typeFile);
      if (fs.existsSync(typeFilePath)) {
        return { hasTypes: true, location: typeFilePath };
      }
    }

    // Check for types directory
    const typesDir = path.join(depPath, 'types');
    if (fs.existsSync(typesDir)) {
      return { hasTypes: true, location: typesDir };
    }

    // Check for @types package
    const typesPackagePath = path.join(depPath, '..', '@types', path.basename(depPath));
    if (fs.existsSync(typesPackagePath)) {
      return { hasTypes: true, location: typesPackagePath };
    }

    return { hasTypes: false };
  }

  private extractDocumentationUrl(packageJson: any): string | undefined {
    // Common patterns for documentation URLs
    if (packageJson.docs) return packageJson.docs;
    if (packageJson.documentation) return packageJson.documentation;
    
    // Try to construct from repository
    const repo = this.extractRepositoryUrl(packageJson);
    if (repo) {
      if (repo.includes('github.com')) {
        return `${repo}#readme`;
      }
    }

    // Try npm docs URL
    if (packageJson.name) {
      return `https://www.npmjs.com/package/${packageJson.name}`;
    }

    return undefined;
  }

  private extractRepositoryUrl(packageJson: any): string | undefined {
    if (typeof packageJson.repository === 'string') {
      return UrlValidator.normalizeUrl(packageJson.repository);
    }
    
    if (packageJson.repository && packageJson.repository.url) {
      return UrlValidator.normalizeUrl(packageJson.repository.url);
    }

    // Check for common fields
    if (packageJson.url) return UrlValidator.normalizeUrl(packageJson.url);
    if (packageJson.homepage) return UrlValidator.normalizeUrl(packageJson.homepage);

    return undefined;
  }
}
