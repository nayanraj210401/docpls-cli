import { BaseTool } from './base';
import { UpdateDocumentationArgs, ToolResponse } from '../types/index';

export class UpdateDocumentationTool extends BaseTool {
  async execute(args: UpdateDocumentationArgs): Promise<ToolResponse> {
    try {
      await this.cli.getStorage().updateDocumentationUrl(args.dependencyName, args.docsUrl);

      const result = {
        success: true,
        dependency: args.dependencyName,
        docsUrl: args.docsUrl,
      };

      return this.createResponse(result);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
