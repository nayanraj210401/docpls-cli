import { Dependency, Project, DocPlsConfig } from '../../types';
export { DocPlsConfig } from '../../types';

export interface MCPToolArgs {
  [key: string]: any;
}

export interface ListDependenciesArgs extends MCPToolArgs {
  projectPath?: string;
  filter?: {
    type?: 'dependency' | 'devDependency' | 'peerDependency';
    name?: string;
  };
}

export interface GetDependencyArgs extends MCPToolArgs {
  dependencyName: string;
  projectPath?: string;
}

export interface GetDocumentationArgs extends MCPToolArgs {
  dependencyName: string;
  projectPath?: string;
}

export interface UpdateDocumentationArgs extends MCPToolArgs {
  dependencyName: string;
  docsUrl: string;
  projectPath?: string;
}

export interface GetProjectInfoArgs extends MCPToolArgs {
  projectPath?: string;
}

export interface QueryArgs extends MCPToolArgs {
  query: string;
  type?: 'dependency' | 'keyword';
  projectPath?: string;
  filters?: {
    dependencyType?: 'dependency' | 'devDependency' | 'peerDependency';
    caseSensitive?: boolean;
    exactMatch?: boolean;
    maxResults?: number;
  };
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface DependencyInfo {
  name: string;
  version?: string;
  resolvedVersion?: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  location?: string;
  hasTypes?: boolean;
  typesLocation?: string;
  isInstalled?: boolean;
  isPrivate?: boolean;
  sourceLocation?: string;
}

export interface DocumentationInfo {
  docsUrl?: string;
  homepage?: string;
  repository?: string;
  recommendedSections?: string[];
}

export interface ProjectInfo {
  path: string;
  type: string;
  manifestFiles?: string[];
  lockFiles?: string[];
  lastAnalyzed?: Date;
  isMonoRepo?: boolean;
  workspaces?: string[];
}
