export enum ProjectType {
  NODE = 'node',
  PYTHON = 'python',
  RUST = 'rust',
  JAVA = 'java',
  UNKNOWN = 'unknown'
}

export interface Dependency {
  name: string;
  version?: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  location?: string;        // Path in node_modules or site-packages
  hasTypes?: boolean;       // Has TypeScript definitions
  typesLocation?: string;   // Path to type definitions
  docsUrl?: string;
  homepage?: string;
  repository?: string;
  isPrivate?: boolean;
  isInstalled?: boolean;    // Actually installed in node_modules or site-packages
  resolvedVersion?: string;  // Actual installed version
  sourceLocation?: string;   // Path to source files (for Python packages)
}

export interface Project {
  path: string;
  type: ProjectType;
  manifestFiles: string[];
  lockFiles: string[];
  dependencies: Dependency[];
  lastAnalyzed: Date;
  isMonoRepo?: boolean;
  workspaces?: string[];
}

export interface ProjectDetector {
  detect(projectPath: string): ProjectType | null;
  getManifestFiles(): string[];
  getLockFiles(): string[];
}

export interface DependencyParser {
  parse(filePath: string): Dependency[];
  supports(fileType: string): boolean;
}

export interface LocalStore {
  saveProject(project: Project): Promise<void>;
  getProject(projectPath: string): Promise<Project | null>;
  listProjects(): Promise<Project[]>;
  removeProject(projectPath: string): Promise<void>;
  updateDocumentationUrl(dependencyName: string, docsUrl: string): Promise<void>;
}

export interface NodeModulesResolver {
  resolveDependency(name: string, projectPath: string): Dependency | null;
  findTypeDefinitions(dependencyPath: string): { hasTypes: boolean; location?: string };
  getDocumentationUrl(name: string): string;
  parseLockFile(lockFilePath: string): Map<string, string>;
}

export interface DocPlsConfig {
  mcpServer?: string;
  defaultDocumentationFormat?: 'markdown' | 'json';
}
