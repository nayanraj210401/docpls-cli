import { DocPlsCLI } from '../../index';
import { ToolResponse, MCPToolArgs } from '../types/index';
import { encode } from '@toon-format/toon';

export abstract class BaseTool {
  protected cli: DocPlsCLI;

  constructor(cli: DocPlsCLI) {
    this.cli = cli;
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
    const toonOutput = compress ? encode(data) : JSON.stringify(data);
    
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

  protected createErrorResponse(message: string): ToolResponse {
    return this.createResponse(`Error: ${message}`, true);
  }
}
