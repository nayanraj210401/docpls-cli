import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DocPlsCLI } from '../index';
import { ToolRegistry } from './tools/index';

export class DocPlsMCPServer {
  private server: Server;
  private cli: DocPlsCLI;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.server = new Server(
      {
        name: 'docpls-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cli = new DocPlsCLI();
    this.toolRegistry = new ToolRegistry(this.cli);
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.toolRegistry.getToolDefinitions(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        const tool = this.toolRegistry.getTool(name);
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        return await tool.execute(args);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DocPls MCP Server started');
  }
}
