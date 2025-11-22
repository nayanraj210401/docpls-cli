import { BaseTool } from './base';
import { GetProjectInfoArgs, ToolResponse } from '../types/index';

export class GetProjectInfoTool extends BaseTool {
  async execute(args: GetProjectInfoArgs): Promise<ToolResponse> {
    try {
      const project = await this.getProject(args.projectPath);

      const config = this.getConfig(args.projectPath);

      const totalDeps = project.dependencies.length;
      const prodDeps = project.dependencies.filter(d => d.type === 'dependency').length;
      const devDeps = project.dependencies.filter(d => d.type === 'devDependency').length;
      const peerDeps = project.dependencies.filter(d => d.type === 'peerDependency').length;
      const withTypes = project.dependencies.filter(d => d.hasTypes).length;
      const installed = project.dependencies.filter(d => d.isInstalled).length;

      let markdown = `# 📊 Project Summary: ${project.path}\n\n`;

      markdown += `## ℹ️ General Info\n`;
      markdown += `- **Type**: ${project.type.toUpperCase()}\n`;
      markdown += `- **Last Analyzed**: ${project.lastAnalyzed.toLocaleString()}\n`;
      markdown += `- **Mono-Repo**: ${project.isMonoRepo ? '✅ Yes' : '❌ No'}\n`;
      if (project.workspaces && project.workspaces.length > 0) {
        markdown += `- **Workspaces**: ${project.workspaces.join(', ')}\n`;
      }

      markdown += `\n## 📦 Dependency Stats\n`;
      markdown += `- **Total Dependencies**: ${totalDeps}\n`;
      markdown += `- **Production**: ${prodDeps}\n`;
      markdown += `- **Development**: ${devDeps}\n`;
      markdown += `- **Peer**: ${peerDeps}\n`;
      markdown += `- **Installed**: ${installed} / ${totalDeps}\n`;
      markdown += `- **TypeScript Support**: ${withTypes} / ${totalDeps}\n`;

      markdown += `\n## 📂 Configuration Files\n`;
      if (project.manifestFiles.length > 0) {
        markdown += `**Manifests**:\n`;
        project.manifestFiles.forEach(f => markdown += `- \`${f}\`\n`);
      }
      if (project.lockFiles.length > 0) {
        markdown += `**Lock Files**:\n`;
        project.lockFiles.forEach(f => markdown += `- \`${f}\`\n`);
      }

      markdown += `\n> **🤖 Suggested Action**: Use \`list_dependencies\` to see the full list of packages.`;

      return this.createResponse(markdown);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
