import { BaseTool } from './base';
import { GetDependencyArgs, ToolResponse } from '../types/index';

export class GetDependencyTool extends BaseTool {
  async execute(args: GetDependencyArgs): Promise<ToolResponse> {
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
          resolvedVersion: dependency.resolvedVersion,
          type: dependency.type,
          location: dependency.location,
          hasTypes: dependency.hasTypes,
          typesLocation: dependency.typesLocation,
          isInstalled: dependency.isInstalled,
          isPrivate: dependency.isPrivate,
          sourceLocation: dependency.sourceLocation,
        },
        documentation: {
          docsUrl: dependency.docsUrl,
          homepage: dependency.homepage,
          repository: dependency.repository,
        },
        project: {
          path: project.path,
          type: project.type,
        },
      };

      return this.createResponse(result);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
