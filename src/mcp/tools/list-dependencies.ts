import { BaseTool } from './base';
import { ListDependenciesArgs, ToolResponse } from '../types/index';

export class ListDependenciesTool extends BaseTool {
  async execute(args: ListDependenciesArgs): Promise<ToolResponse> {
    try {
      const project = await this.getProject(args.projectPath);
      let dependencies = project.dependencies;

      // Apply filters
      if (args.filter?.type) {
        dependencies = dependencies.filter(dep => dep.type === args.filter?.type);
      }
      if (args.filter?.name) {
        dependencies = dependencies.filter(dep => 
          dep.name.toLowerCase().includes(args.filter!.name!.toLowerCase())
        );
      }

      const result = {
        project: {
          path: project.path,
          type: project.type,
        },
        dependencies: dependencies.map(dep => ({
          name: dep.name,
          version: dep.version,
          type: dep.type,
          docsUrl: dep.docsUrl,
          homepage: dep.homepage,
          repository: dep.repository,
          isInstalled: dep.isInstalled,
          resolvedVersion: dep.resolvedVersion,
        })),
      };

      return this.createResponse(result);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
