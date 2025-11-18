import * as fs from 'fs';
import * as path from 'path';
import { Dependency, NodeModulesResolver } from '../types';

export class NodeModulesResolverImpl implements NodeModulesResolver {
  resolveDependency(name: string, projectPath: string): Dependency | null {
    try {
      const nodeModulesPath = path.join(projectPath, 'node_modules', name);
      
      if (!fs.existsSync(nodeModulesPath)) {
        return {
          name,
          type: 'dependency',
          isInstalled: false,
          location: '',
          hasTypes: false
        };
      }

      // Check if it's actually a directory
      const stats = fs.statSync(nodeModulesPath);
      if (!stats.isDirectory()) {
        return {
          name,
          type: 'dependency',
          isInstalled: false,
          location: '',
          hasTypes: false
        };
      }

      // Try to read the package.json of the dependency to get actual version
      let resolvedVersion: string | undefined;
      try {
        const depPackageJsonPath = path.join(nodeModulesPath, 'package.json');
        if (fs.existsSync(depPackageJsonPath)) {
          const depPackageJson = JSON.parse(fs.readFileSync(depPackageJsonPath, 'utf-8'));
          resolvedVersion = depPackageJson.version;
        }
      } catch (error) {
        // Can't read version, that's okay
      }

      // Check for TypeScript definitions
      const typeInfo = this.findTypeDefinitions(nodeModulesPath);
      
      // Get documentation URL
      const docsUrl = this.getDocumentationUrl(name);

      return {
        name,
        type: 'dependency',
        resolvedVersion,
        isInstalled: true,
        location: nodeModulesPath,
        hasTypes: typeInfo.hasTypes,
        typesLocation: typeInfo.location,
        docsUrl
      };
    } catch (error) {
      console.error(`Error resolving dependency ${name}:`, error);
      return null;
    }
  }

  findTypeDefinitions(dependencyPath: string): { hasTypes: boolean; location?: string } {
    // Check for index.d.ts in the main package
    const indexDtsPath = path.join(dependencyPath, 'index.d.ts');
    if (fs.existsSync(indexDtsPath)) {
      return { hasTypes: true, location: indexDtsPath };
    }

    // Check for types directory
    const typesDir = path.join(dependencyPath, 'types');
    if (fs.existsSync(typesDir) && fs.statSync(typesDir).isDirectory()) {
      return { hasTypes: true, location: typesDir };
    }

    // Check for @types package
    const packageName = path.basename(dependencyPath);
    const typesPackageName = `@types/${packageName}`;
    const nodeModulesPath = path.dirname(dependencyPath); // Go up to node_modules
    const typesPath = path.join(nodeModulesPath, typesPackageName);
    
    if (fs.existsSync(typesPath)) {
      return { hasTypes: true, location: typesPath };
    }

    return { hasTypes: false };
  }

  getDocumentationUrl(name: string): string {
    // Common documentation URL patterns
    const patterns = [
      `https://npmjs.com/package/${name}`,
      `https://github.com/${name}/${name}`,
      `https://github.com/nodejs/${name}`,
      `https://www.npmjs.com/package/${name}`
    ];

    // For scoped packages, try different patterns
    if (name.startsWith('@')) {
      const [scope, packageName] = name.split('/');
      patterns.unshift(`https://github.com/${scope}/${packageName}`);
      patterns.unshift(`https://npmjs.com/package/${name}`);
    }

    // For well-known packages, provide specific URLs
    const knownUrls: { [key: string]: string } = {
      'react': 'https://reactjs.org/docs',
      'react-dom': 'https://reactjs.org/docs/react-dom',
      'vue': 'https://vuejs.org/guide',
      'angular': 'https://angular.io/docs',
      'express': 'https://expressjs.com/en/api.html',
      'lodash': 'https://lodash.com/docs',
      'webpack': 'https://webpack.js.org/api',
      'typescript': 'https://www.typescriptlang.org/docs',
      'node': 'https://nodejs.org/docs'
    };

    return knownUrls[name] || patterns[0];
  }

  parseLockFile(lockFilePath: string): Map<string, string> {
    const dependencies = new Map<string, string>();
    
    try {
      const content = fs.readFileSync(lockFilePath, 'utf-8');
      const fileName = path.basename(lockFilePath);

      if (fileName === 'package-lock.json') {
        this.parsePackageLock(content, dependencies);
      } else if (fileName === 'yarn.lock') {
        this.parseYarnLock(content, dependencies);
      } else if (fileName === 'pnpm-lock.yaml') {
        this.parsePnpmLock(content, dependencies);
      }
    } catch (error) {
      console.error(`Error parsing lock file ${lockFilePath}:`, error);
    }

    return dependencies;
  }

  private parsePackageLock(content: string, dependencies: Map<string, string>): void {
    try {
      const lockData = JSON.parse(content);
      
      if (lockData.dependencies) {
        for (const [name, info] of Object.entries(lockData.dependencies)) {
          const depInfo = info as any;
          dependencies.set(name, depInfo.version || '');
        }
      }

      if (lockData.packages) {
        for (const [path, info] of Object.entries(lockData.packages)) {
          if (path === '') continue; // Skip root package
          
          const depInfo = info as any;
          const name = path.startsWith('node_modules/') 
            ? path.replace('node_modules/', '')
            : path;
          
          dependencies.set(name, depInfo.version || '');
        }
      }
    } catch (error) {
      console.error('Error parsing package-lock.json:', error);
    }
  }

  private parseYarnLock(content: string, dependencies: Map<string, string>): void {
    try {
      // Simple regex-based parsing for yarn.lock
      const lines = content.split('\n');
      let currentPackage = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Match package name line (ends with ':')
        const packageMatch = trimmedLine.match(/^([^@\s]+|@[^@\s]+\/[^@\s]+):\s*$/);
        if (packageMatch) {
          currentPackage = packageMatch[1];
          continue;
        }
        
        // Match version line
        if (currentPackage && trimmedLine.startsWith('version ')) {
          const version = trimmedLine.replace('version ', '').replace(/"/g, '');
          dependencies.set(currentPackage, version);
          currentPackage = '';
        }
      }
    } catch (error) {
      console.error('Error parsing yarn.lock:', error);
    }
  }

  private parsePnpmLock(content: string, dependencies: Map<string, string>): void {
    try {
      // Simple regex-based parsing for pnpm-lock.yaml
      const lines = content.split('\n');
      let currentPackage = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Match package line (indented with package name and version)
        const packageMatch = trimmedLine.match(/^([^@\s]+|@[^@\s]+\/[^@\s]+):\s*(.+)$/);
        if (packageMatch) {
          const name = packageMatch[1];
          const version = packageMatch[2];
          dependencies.set(name, version);
        }
      }
    } catch (error) {
      console.error('Error parsing pnpm-lock.yaml:', error);
    }
  }
}
