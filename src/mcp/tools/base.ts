import { DocPlsCLI } from '../../index';
import { ToolResponse, MCPToolArgs, DocPlsConfig } from '../types/index';
import { encode } from '@toon-format/toon';
import { ConfigLoader } from '../../utils/config';

export abstract class BaseTool {
  protected cli: DocPlsCLI;

  constructor(cli: DocPlsCLI) {
    this.cli = cli;
  }

  protected getConfig(projectPath?: string): DocPlsConfig {
    return ConfigLoader.loadConfig(projectPath);
  }

  abstract execute(args: MCPToolArgs): Promise<ToolResponse>;

  protected async getProject(projectPath?: string) {
    const path = projectPath || process.cwd();
    const project = await this.cli.getStorage().getProject(path);

    if (!project) {
      throw new Error(`Project not found at ${path}. Run 'docpls-cli init' first.`);
    }

    return project;
  }

  protected findDependency(dependencies: any[], dependencyName: string) {
    return dependencies.find(dep =>
      dep.name.toLowerCase() === dependencyName.toLowerCase()
    );
  }

  protected createResponse(data: any, isError = false, compress: boolean = false): ToolResponse {
    // Keep data as JSON internally, but output toon format for LLM
    let toonOutput: string;

    if (typeof data === 'string') {
      toonOutput = data;
    } else {
      toonOutput = compress ? encode(data) : JSON.stringify(data);
    }

    return {
      content: [
        {
          type: 'text',
          text: toonOutput,
        },
      ],
      isError,
    };
  }

  protected createErrorResponse(message: string, suggestion?: string): ToolResponse {
    let errorMessage = `Error: ${message}`;

    if (suggestion) {
      errorMessage += `\n\n### 💡 Suggested Action\n${suggestion}`;
    }

    return this.createResponse(errorMessage, true);
  }
}
