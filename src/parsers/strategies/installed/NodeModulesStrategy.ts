import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';
import { DocumentationUrlBuilder, UrlValidator } from '../../../utils/UrlValidator';

export class NodeModulesStrategy implements ParsingStrategy {
  readonly name = 'NodeModulesStrategy';
  priority = 3; // Lowest priority, for verification

  canHandle(filePath: string): boolean {
    return path.basename(filePath) === 'node_modules' && fs.statSync(filePath).isDirectory();
  }

  async parse(filePath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];

    try {
      const items = fs.readdirSync(filePath, { withFileTypes: true });

      for (const item of items) {
        // Check if it's a directory or a symlink to a directory
        const isDir = item.isDirectory() || (item.isSymbolicLink() && fs.statSync(path.join(filePath, item.name)).isDirectory());
        if (isDir && !item.name.startsWith('.')) {
          // Handle scoped packages (like @types)
          if (item.name.startsWith('@')) {
            const scopedPath = path.join(filePath, item.name);
            try {
              const scopedItems = fs.readdirSync(scopedPath, { withFileTypes: true });
              for (const scopedItem of scopedItems) {
                const isScopedDir = scopedItem.isDirectory() || (scopedItem.isSymbolicLink() && fs.statSync(path.join(scopedPath, scopedItem.name)).isDirectory());
                if (isScopedDir) {
                  const dep = await this.analyzeDependency(filePath, path.join(item.name, scopedItem.name));
                  if (dep) {
                    dependencies.push(dep);
                  }
                }
              }
            } catch (error) {
              console.error(`Error reading scoped directory ${item.name}: ${error}`);
            }
          } else {
            const dep = await this.analyzeDependency(filePath, item.name);
            if (dep) {
              dependencies.push(dep);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing node_modules: ${error}`);
    }

    return dependencies;
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
        version: packageJson.version,
        resolvedVersion: packageJson.version,
        isInstalled: true,
        location: depPath,
        hasTypes: typeInfo.hasTypes,
        typesLocation: typeInfo.location,
        docsUrl,
        homepage,
        repository,
        isPrivate: packageJson.private || false,
        type: 'dependency' // Will be updated by manifest strategies
      };
    } catch (error) {
      console.error(`Error analyzing dependency ${depName}: ${error}`);
      return null;
    }
  }

  private findTypeDefinitions(depPath: string): { hasTypes: boolean; location?: string } {
    // Helper function to recursively search for .d.ts files
    const searchForDtsFiles = (dir: string): string | null => {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isFile() && file.name.endsWith('.d.ts')) {
            return fullPath;
          }
          
          if (file.isDirectory()) {
            const found = searchForDtsFiles(fullPath);
            if (found) {
              return found;
            }
          }
        }
      } catch (error) {
        // Directory might not exist or be readable
      }
      
      return null;
    };

    // Search for any .d.ts files in the dependency directory and subdirectories
    const dtsFile = searchForDtsFiles(depPath);
    if (dtsFile) {
      return { hasTypes: true, location: dtsFile };
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

  
  private extractRepositoryUrl(packageJson: any): string | undefined {
    if (packageJson.repository) {
      if (typeof packageJson.repository === 'string') {
        return UrlValidator.normalizeUrl(packageJson.repository);
      }
      if (packageJson.repository.url) {
        return UrlValidator.normalizeUrl(packageJson.repository.url);
      }
    }
    
    // Check for common fields
    if (packageJson.url) return UrlValidator.normalizeUrl(packageJson.url);
    if (packageJson.homepage) return UrlValidator.normalizeUrl(packageJson.homepage);
    
    return undefined;
  }
}
