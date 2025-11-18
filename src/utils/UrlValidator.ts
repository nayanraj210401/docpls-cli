import * as https from 'https';
import * as http from 'http';

export interface DocumentationUrl {
  url: string;
  source: 'package' | 'repository' | 'registry' | 'fallback';
  isValid?: boolean;
}

export class UrlValidator {
  /**
   * Validate if a URL is accessible and returns actual content
   */
  static async validateUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.request(url, { method: 'HEAD', timeout: 5000 }, (response) => {
          resolve(response.statusCode !== undefined && response.statusCode < 400);
        });
        
        request.on('error', () => resolve(false));
        request.on('timeout', () => {
          request.destroy();
          resolve(false);
        });
        
        request.end();
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Validate multiple URLs and return the first valid one
   */
  static async findFirstValidUrl(urls: DocumentationUrl[]): Promise<DocumentationUrl | undefined> {
    for (const docUrl of urls) {
      const isValid = await this.validateUrl(docUrl.url);
      if (isValid) {
        return { ...docUrl, isValid: true };
      }
    }
    return undefined;
  }

  /**
   * Clean and normalize URLs
   */
  static normalizeUrl(url: string): string {
    if (!url) return url;
    
    // Remove trailing slashes
    url = url.replace(/\/+$/, '');
    
    // Convert git URLs to HTTPS
    if (url.startsWith('git+')) {
      url = url.replace('git+', '').replace('.git', '');
    }
    if (url.startsWith('git@')) {
      url = `https://${url.replace('git@', '').replace(':', '/').replace('.git', '')}`;
    }
    if (url.endsWith('.git')) {
      url = url.slice(0, -4);
    }
    
    return url;
  }
}

export class RegistryFetcher {
  /**
   * Fetch official documentation URL from npm registry
   */
  static async getNpmDocsUrl(packageName: string): Promise<DocumentationUrl | undefined> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${packageName}`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) return undefined;
      
      const data = await response.json() as {
        homepage?: string;
        repository?: { url: string };
        bugs?: { url: string };
      };
      
      // Check various fields for documentation URLs
      if (data.homepage) {
        return { url: UrlValidator.normalizeUrl(data.homepage), source: 'registry' };
      }
      
      if (data.repository?.url) {
        const repoUrl = UrlValidator.normalizeUrl(data.repository.url);
        return { url: repoUrl, source: 'registry' };
      }
      
      if (data.bugs?.url) {
        const bugsUrl = UrlValidator.normalizeUrl(data.bugs.url);
        return { url: bugsUrl, source: 'registry' };
      }
      
      // Fallback to npm package page
      return { url: `https://www.npmjs.com/package/${packageName}`, source: 'fallback' };
    } catch {
      return undefined;
    }
  }

  /**
   * Get documentation URL for Python packages from PyPI
   */
  static async getPyPiDocsUrl(packageName: string): Promise<DocumentationUrl | undefined> {
    try {
      const response = await fetch(`https://pypi.org/pypi/${packageName}/json`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) return undefined;
      
      const data = await response.json() as {
        info: {
          home_page?: string;
          project_urls?: {
            Documentation?: string;
            Homepage?: string;
          };
        };
      };
      
      if (data.info.home_page) {
        return { url: UrlValidator.normalizeUrl(data.info.home_page), source: 'registry' };
      }
      
      if (data.info.project_urls?.Documentation) {
        return { url: UrlValidator.normalizeUrl(data.info.project_urls.Documentation), source: 'registry' };
      }
      
      if (data.info.project_urls?.Homepage) {
        return { url: UrlValidator.normalizeUrl(data.info.project_urls.Homepage), source: 'registry' };
      }
      
      // Fallback to PyPI package page
      return { url: `https://pypi.org/project/${packageName}`, source: 'fallback' };
    } catch {
      return undefined;
    }
  }
}

export class DocumentationUrlBuilder {
  /**
   * Build documentation URLs with validation and fallbacks
   */
  static async buildDocumentationUrls(packageJson: any): Promise<DocumentationUrl | undefined> {
    const urls: DocumentationUrl[] = [];
    
    // 1. Direct fields from package.json (highest priority)
    if (packageJson.docs) {
      urls.push({ url: UrlValidator.normalizeUrl(packageJson.docs), source: 'package' });
    }
    if (packageJson.documentation) {
      urls.push({ url: UrlValidator.normalizeUrl(packageJson.documentation), source: 'package' });
    }
    if (packageJson.homepage) {
      urls.push({ url: UrlValidator.normalizeUrl(packageJson.homepage), source: 'package' });
    }
    
    // 2. Repository-based URLs
    const repoUrl = this.extractRepositoryUrl(packageJson);
    if (repoUrl) {
      // GitHub/GitLab specific patterns
      if (repoUrl.includes('github.com')) {
        urls.push({ url: `${repoUrl}#readme`, source: 'repository' });
        urls.push({ url: `${repoUrl}/blob/main/README.md`, source: 'repository' });
        urls.push({ url: `${repoUrl}/blob/master/README.md`, source: 'repository' });
        urls.push({ url: `${repoUrl}/wiki`, source: 'repository' });
      } else if (repoUrl.includes('gitlab.com')) {
        urls.push({ url: `${repoUrl}/-/blob/main/README.md`, source: 'repository' });
        urls.push({ url: `${repoUrl}/-/blob/master/README.md`, source: 'repository' });
        urls.push({ url: `${repoUrl}/-/wikis`, source: 'repository' });
      } else {
        urls.push({ url: repoUrl, source: 'repository' });
      }
    }
    
    // 3. Registry-based URLs
    if (packageJson.name) {
      // Try npm registry (for Node.js packages)
      const npmDocs = await RegistryFetcher.getNpmDocsUrl(packageJson.name);
      if (npmDocs) urls.push(npmDocs);
      
      // Try PyPI (might be a Python package with same name)
      const pypiDocs = await RegistryFetcher.getPyPiDocsUrl(packageJson.name);
      if (pypiDocs) urls.push(pypiDocs);
    }
    
    // 4. Common documentation hosting patterns
    if (packageJson.name) {
      const name = packageJson.name;
      urls.push({ url: `https://www.npmjs.com/package/${name}`, source: 'fallback' });
      urls.push({ url: `https://pypi.org/project/${name}`, source: 'fallback' });
      
      // Common documentation sites
      urls.push({ url: `https://${name}.readthedocs.io`, source: 'fallback' });
      urls.push({ url: `https://docs.rs/${name}`, source: 'fallback' });
      urls.push({ url: `https://pkg.go.dev/${name}`, source: 'fallback' });
    }
    
    // Find the first valid URL
    return await UrlValidator.findFirstValidUrl(urls);
  }
  
  /**
   * Extract repository URL from package.json
   */
  private static extractRepositoryUrl(packageJson: any): string | undefined {
    if (packageJson.repository) {
      if (typeof packageJson.repository === 'string') {
        return UrlValidator.normalizeUrl(packageJson.repository);
      }
      if (packageJson.repository.url) {
        return UrlValidator.normalizeUrl(packageJson.repository.url);
      }
    }
    
    if (packageJson.url) {
      return UrlValidator.normalizeUrl(packageJson.url);
    }
    
    return undefined;
  }
}
