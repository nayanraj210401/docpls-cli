import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../../types';
import { ParsingStrategy } from '../ParsingStrategy';

interface VirtualEnv {
  path: string;
  type: 'venv' | 'virtualenv' | 'conda' | 'pipenv';
  pythonVersion: string;
  sitePackagesPath: string;
}

export class SitePackagesStrategy implements ParsingStrategy {
  readonly name = 'SitePackagesStrategy';
  priority = 3; // Lowest priority, for verification

  canHandle(filePath: string): boolean {
    // Check if this is a site-packages directory or a virtual environment root
    const basename = path.basename(filePath);
    
    if (basename === 'site-packages' && fs.statSync(filePath).isDirectory()) {
      return true;
    }
    
    // Check if this is a virtual environment root directory
    return this.isVirtualEnvironment(filePath);
  }

  parse(filePath: string): Dependency[] {
    const dependencies: Dependency[] = [];

    try {
      // If this is a virtual environment root, find the site-packages directory
      let sitePackagesPath = filePath;
      
      if (this.isVirtualEnvironment(filePath)) {
        const foundPath = this.findSitePackagesInVenv(filePath);
        if (!foundPath) {
          console.warn(`Could not find site-packages in virtual environment: ${filePath}`);
          return dependencies;
        }
        sitePackagesPath = foundPath;
      }
      
      // Parse the site-packages directory
      dependencies.push(...this.parseSitePackages(sitePackagesPath));
    } catch (error) {
      console.error(`Error analyzing site-packages: ${error}`);
    }

    return dependencies;
  }

  private analyzePackage(sitePackagesPath: string, pkgName: string): Dependency | null {
    const pkgPath = path.join(sitePackagesPath, pkgName);
    
    try {
      // Look for metadata in .dist-info or .egg-info directories
      const items = fs.readdirSync(pkgPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory() && item.name.endsWith('.dist-info')) {
          return this.analyzePackageFromDistInfo(pkgPath, item.name, pkgName);
        } else if (item.isDirectory() && item.name.endsWith('.egg-info')) {
          return this.analyzePackageFromEggInfo(pkgPath, item.name, pkgName);
        }
      }

      // Fallback: try to read __init__.py for version info
      const initPath = path.join(pkgPath, '__init__.py');
      if (fs.existsSync(initPath)) {
        const content = fs.readFileSync(initPath, 'utf-8');
        const version = this.extractVersionFromPythonFile(content);
        
        return {
          name: pkgName,
          version,
          resolvedVersion: version,
          isInstalled: true,
          location: pkgPath,
          type: 'dependency',
          sourceLocation: this.findPackageSourceLocation(pkgPath, pkgName)
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private analyzePackageFromDistInfo(pkgPath: string, distInfoName: string, pkgName: string): Dependency | null {
    try {
      const distInfoPath = path.join(pkgPath, distInfoName);
      const metadataPath = path.join(distInfoPath, 'METADATA');
      
      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        const version = this.extractVersionFromMetadata(content);
        
        return {
          name: pkgName,
          version,
          resolvedVersion: version,
          isInstalled: true,
          location: pkgPath,
          type: 'dependency',
          sourceLocation: this.findPackageSourceLocation(pkgPath, pkgName)
        };
      }
    } catch (error) {
      // Ignore errors
    }
    
    return null;
  }

  private analyzePackageFromEggInfo(pkgPath: string, eggInfoName: string, pkgName: string): Dependency | null {
    try {
      const eggInfoPath = path.join(pkgPath, eggInfoName);
      const metadataPath = path.join(eggInfoPath, 'PKG-INFO');
      
      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, 'utf-8');
        const version = this.extractVersionFromMetadata(content);
        
        return {
          name: pkgName,
          version,
          resolvedVersion: version,
          isInstalled: true,
          location: pkgPath,
          type: 'dependency',
          sourceLocation: this.findPackageSourceLocation(pkgPath, pkgName)
        };
      }
    } catch (error) {
      // Ignore errors
    }
    
    return null;
  }

  private extractPackageNameFromDistInfo(distInfoName: string): string | null {
    // Extract package name from format like "requests-2.28.1.dist-info"
    const match = distInfoName.match(/^(.+)-\d[\d\.\-]*\.dist-info$/);
    return match ? match[1] : null;
  }

  private extractPackageNameFromEggInfo(eggInfoName: string): string | null {
    // Extract package name from format like "requests-2.28.1-py3.9.egg-info"
    const match = eggInfoName.match(/^(.+)-\d[\d\.\-]*-.*\.egg-info$/);
    return match ? match[1] : null;
  }

  private extractVersionFromMetadata(content: string): string {
    // Extract version from METADATA or PKG-INFO files
    const versionMatch = content.match(/^Version:\s*(.+)$/m);
    return versionMatch ? versionMatch[1].trim() : 'unknown';
  }

  private extractVersionFromPythonFile(content: string): string {
    // Extract version from Python __init__.py files
    const patterns = [
      /__version__\s*=\s*['"]([^'"]+)['"]/,
      /version\s*=\s*['"]([^'"]+)['"]/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  /**
   * Find the source location for a Python package
   */
  private findPackageSourceLocation(pkgPath: string, pkgName: string): string | undefined {
    // Check if the package directory itself contains Python source files
    const hasPythonFiles = this.hasPythonSourceFiles(pkgPath);
    if (hasPythonFiles) {
      return pkgPath;
    }

    // Look for the package in a subdirectory
    try {
      const items = fs.readdirSync(pkgPath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const subPath = path.join(pkgPath, item.name);
          if (this.hasPythonSourceFiles(subPath)) {
            return subPath;
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return undefined;
  }

  /**
   * Check if a directory contains Python source files
   */
  private hasPythonSourceFiles(dirPath: string): boolean {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      return items.some(item => 
        item.isFile() && (
          item.name.endsWith('.py') ||
          item.name === '__init__.py'
        )
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory is a virtual environment
   */
  private isVirtualEnvironment(filePath: string): boolean {
    const basename = path.basename(filePath);
    
    // Check for common virtual environment indicators
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
      if (fs.existsSync(path.join(filePath, indicator))) {
        return true;
      }
    }
    
    // Check if this looks like a virtual environment based on directory structure
    try {
      const items = fs.readdirSync(filePath, { withFileTypes: true });
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
   * Find the site-packages directory within a virtual environment
   */
  private findSitePackagesInVenv(venvPath: string): string | null {
    const possiblePaths = [
      // Standard venv layout: lib/pythonX.Y/site-packages
      path.join(venvPath, 'lib', 'python*', 'site-packages'),
      // Conda environment layout: lib/pythonX.Y/site-packages  
      path.join(venvPath, 'lib', 'python*', 'site-packages'),
      // Windows venv layout: Lib/site-packages
      path.join(venvPath, 'Lib', 'site-packages'),
      // Direct site-packages (rare)
      path.join(venvPath, 'site-packages')
    ];

    for (const pattern of possiblePaths) {
      const matches = this.globPaths(pattern);
      for (const match of matches) {
        if (fs.existsSync(match) && fs.statSync(match).isDirectory()) {
          return match;
        }
      }
    }

    // Fallback: manually check lib directory for python versions
    try {
      const libDir = path.join(venvPath, 'lib');
      if (fs.existsSync(libDir)) {
        const items = fs.readdirSync(libDir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory() && item.name.startsWith('python')) {
            const sitePackagesPath = path.join(libDir, item.name, 'site-packages');
            if (fs.existsSync(sitePackagesPath) && fs.statSync(sitePackagesPath).isDirectory()) {
              return sitePackagesPath;
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Simple glob implementation for path patterns
   */
  private globPaths(pattern: string): string[] {
    const parts = pattern.split('*');
    if (parts.length !== 2) {
      return [pattern]; // No wildcard, return as-is
    }

    const [prefix, suffix] = parts;
    const parentDir = path.dirname(prefix);
    
    try {
      const items = fs.readdirSync(parentDir);
      return items
        .filter(item => item.startsWith(path.basename(prefix)) && 
                       item.endsWith(suffix))
        .map(item => path.join(parentDir, item));
    } catch {
      return [];
    }
  }

  /**
   * Parse a site-packages directory for installed packages
   */
  private parseSitePackages(sitePackagesPath: string): Dependency[] {
    const dependencies: Dependency[] = [];

    try {
      const items = fs.readdirSync(sitePackagesPath, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const dep = this.analyzePackage(sitePackagesPath, item.name);
          if (dep) {
            dependencies.push(dep);
          }
        } else if (item.isFile() && item.name.endsWith('.dist-info')) {
          // Handle wheel metadata directories
          const packageName = this.extractPackageNameFromDistInfo(item.name);
          if (packageName) {
            const dep = this.analyzePackageFromDistInfo(sitePackagesPath, item.name, packageName);
            if (dep) {
              dependencies.push(dep);
            }
          }
        } else if (item.isFile() && item.name.endsWith('.egg-info')) {
          // Handle egg metadata directories
          const packageName = this.extractPackageNameFromEggInfo(item.name);
          if (packageName) {
            const dep = this.analyzePackageFromEggInfo(sitePackagesPath, item.name, packageName);
            if (dep) {
              dependencies.push(dep);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing site-packages: ${error}`);
    }

    return dependencies;
  }
}
