import { ListDependenciesTool } from './list-dependencies';
import { GetDependencyTool } from './get-dependency';
import { GetDocumentationTool } from './get-documentation';
import { UpdateDocumentationTool } from './update-documentation';
import { GetProjectInfoTool } from './get-project-info';
import { QueryTool } from './query';
import { DocPlsCLI } from '../../index';

export class ToolRegistry {
  private tools: Map<string, any> = new Map();

  constructor(cli: DocPlsCLI) {
    this.registerTools(cli);
  }

  private registerTools(cli: DocPlsCLI) {
    this.tools.set('list_dependencies', new ListDependenciesTool(cli));
    this.tools.set('get_dependency', new GetDependencyTool(cli));
    this.tools.set('get_documentation', new GetDocumentationTool(cli));
    this.tools.set('update_documentation', new UpdateDocumentationTool(cli));
    this.tools.set('get_project_info', new GetProjectInfoTool(cli));
    this.tools.set('query', new QueryTool(cli));
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  getAllToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getToolDefinitions() {
    return [
      {
        name: 'list_dependencies',
        description: 'List all dependencies in a project. Use this to get a high-level overview of what packages are installed, their versions, and types. Useful for initial exploration or finding a package name.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project (defaults to current directory)',
            },
            filter: {
              type: 'object',
              description: 'Optional filters',
              properties: {
                type: {
                  type: 'string',
                  enum: ['dependency', 'devDependency', 'peerDependency'],
                },
                name: {
                  type: 'string',
                  description: 'Partial match for dependency name',
                },
              },
            },
          },
        },
      },
      {
        name: 'get_dependency',
        description: 'Get detailed information about a specific dependency. Use this when you need to find the physical location of a package, check for TypeScript support, or find its documentation URL.',
        inputSchema: {
          type: 'object',
          properties: {
            dependencyName: {
              type: 'string',
              description: 'Name of the dependency',
            },
            projectPath: {
              type: 'string',
              description: 'Path to the project (defaults to current directory)',
            },
          },
          required: ['dependencyName'],
        },
      },
      {
        name: 'get_documentation',
        description: 'Get documentation URL for a specific dependency. Use this when you need to read the official docs, find examples, or check the API reference.',
        inputSchema: {
          type: 'object',
          properties: {
            dependencyName: {
              type: 'string',
              description: 'Name of the dependency',
            },
            projectPath: {
              type: 'string',
              description: 'Path to the project (defaults to current directory)',
            },
          },
          required: ['dependencyName'],
        },
      },
      {
        name: 'update_documentation',
        description: 'Update documentation URL for a dependency. Use this to fix broken or missing documentation links.',
        inputSchema: {
          type: 'object',
          properties: {
            dependencyName: {
              type: 'string',
              description: 'Name of the dependency',
            },
            docsUrl: {
              type: 'string',
              description: 'Documentation URL',
            },
            projectPath: {
              type: 'string',
              description: 'Path to the project (defaults to current directory)',
            },
          },
          required: ['dependencyName', 'docsUrl'],
        },
      },
      {
        name: 'get_project_info',
        description: 'Get detailed information about a project. Use this to understand the project structure, type (Node/Python), and overall dependency statistics.',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project (defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'query',
        description: 'Search dependencies and their metadata. Use this when you are looking for a package but don\'t know the exact name, or want to find packages related to a keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search term. For dependency searches: package name or partial name. For keyword searches: term to find in dependency names or documentation URLs',
            },
            type: {
              type: 'string',
              enum: ['dependency', 'keyword'],
              description: 'What type of search to perform. Choose "dependency" to search dependencies by name, "keyword" to search dependency metadata',
              default: 'dependency',
            },
            projectPath: {
              type: 'string',
              description: 'Absolute path to the project root directory to search in. Example: "/Users/username/my-project" or "." for current directory',
            },
            filters: {
              type: 'object',
              description: 'Optional search filters to narrow down results',
              properties: {
                dependencyType: {
                  type: 'string',
                  enum: ['dependency', 'devDependency', 'peerDependency'],
                  description: 'For dependency searches: filter by dependency type. "dependency" for runtime deps, "devDependency" for dev tools, "peerDependency" for peer requirements',
                },
                caseSensitive: {
                  type: 'boolean',
                  description: 'Whether search should be case sensitive. Set to true for exact case matching, false for case-insensitive search',
                  default: false,
                },
                exactMatch: {
                  type: 'boolean',
                  description: 'Whether to match whole words only. Set to true to avoid partial matches, false to include substrings',
                  default: false,
                },
                maxResults: {
                  type: 'integer',
                  description: 'Maximum number of results to return. Use smaller numbers for faster searches, larger numbers for comprehensive results',
                  default: 100,
                },
              },
            },
          },
          required: ['query'],
        },
      },
    ];
  }
}
