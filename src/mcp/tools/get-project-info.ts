import { BaseTool } from './base';
import { GetProjectInfoArgs, ToolResponse } from '../types/index';

export class GetProjectInfoTool extends BaseTool {
  async execute(args: GetProjectInfoArgs): Promise<ToolResponse> {
    try {
      const project = await this.getProject(args.projectPath);

      const result = {
        project: {
          path: project.path,
          type: project.type,
          manifestFiles: project.manifestFiles,
          lockFiles: project.lockFiles,
          lastAnalyzed: project.lastAnalyzed,
          isMonoRepo: project.isMonoRepo,
          workspaces: project.workspaces,
        },
        dependencies: {
          total: project.dependencies.length,
          byType: {
            dependency: project.dependencies.filter(d => d.type === 'dependency').length,
            devDependency: project.dependencies.filter(d => d.type === 'devDependency').length,
            peerDependency: project.dependencies.filter(d => d.type === 'peerDependency').length,
          },
          withDocs: project.dependencies.filter(d => d.docsUrl || d.homepage).length,
          installed: project.dependencies.filter(d => d.isInstalled).length,
        },
      };

      return this.createResponse(result);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
