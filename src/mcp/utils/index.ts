export function formatDependencyName(name: string): string {
  return name.toLowerCase().trim();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeProjectPath(path: string): string {
  return path.replace(/\/+$/, '');
}

export function extractRepoFromGithubUrl(url: string): string | null {
  const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (githubMatch) {
    return `${githubMatch[1]}/${githubMatch[2]}`;
  }
  return null;
}

export function determineDependencyType(packageName: string): 'dependency' | 'devDependency' | 'peerDependency' {
  // Common patterns for dev dependencies
  const devPatterns = [
    /^@types\//,
    /-dev$/,
    /-test$/,
    /testing/,
    /jest/,
    /mocha/,
    /webpack/,
    /rollup/,
    /vite/,
    /eslint/,
    /prettier/,
    /babel/,
    /ts-node/,
  ];

  // Common patterns for peer dependencies
  const peerPatterns = [
    /react$/,
    /vue$/,
    /angular$/,
    /express$/,
  ];

  const packageNameLower = packageName.toLowerCase();

  if (devPatterns.some(pattern => pattern.test(packageNameLower))) {
    return 'devDependency';
  }

  if (peerPatterns.some(pattern => pattern.test(packageNameLower))) {
    return 'peerDependency';
  }

  return 'dependency';
}
