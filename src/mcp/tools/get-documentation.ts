import { BaseTool } from './base';
import { GetDocumentationArgs, ToolResponse } from '../types/index';

export class GetDocumentationTool extends BaseTool {
  async execute(args: GetDocumentationArgs): Promise<ToolResponse> {
    try {
      const project = await this.getProject(args.projectPath);
      const dependency = this.findDependency(project.dependencies, args.dependencyName);

      if (!dependency) {
        throw new Error(`Dependency '${args.dependencyName}' not found in project`);
      }

      const result = {
        dependency: {
          name: dependency.name,
          version: dependency.version,
          type: dependency.type,
        },
        documentation: {
          officialUrl: dependency.homepage,
          customUrl: dependency.docsUrl,
          repository: dependency.repository,
          recommendedSections: [
            'API Reference',
            'Getting Started',
            'Examples',
            'Configuration',
          ],
        },
      };

      return this.createResponse(result);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
