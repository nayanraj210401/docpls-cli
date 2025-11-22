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

      const config = this.getConfig(args.projectPath);

      // Group dependencies by type
      const prodDeps = dependencies.filter(d => d.type === 'dependency');
      const devDeps = dependencies.filter(d => d.type === 'devDependency');
      const peerDeps = dependencies.filter(d => d.type === 'peerDependency');

      let markdown = `# Project Dependencies: ${project.path}\n\n`;
      markdown += `Found ${dependencies.length} total dependencies.\n\n`;

      if (prodDeps.length > 0) {
        markdown += `## 📦 Production Dependencies (${prodDeps.length})\n`;
        prodDeps.forEach(dep => {
          const version = dep.resolvedVersion || dep.version || 'unknown';
          const types = dep.hasTypes ? '📝' : '';
          markdown += `- **${dep.name}** @ \`${version}\` ${types}\n`;
        });
        markdown += '\n';
      }

      if (devDeps.length > 0) {
        markdown += `## 🛠️ Development Dependencies (${devDeps.length})\n`;
        devDeps.forEach(dep => {
          const version = dep.resolvedVersion || dep.version || 'unknown';
          const types = dep.hasTypes ? '📝' : '';
          markdown += `- **${dep.name}** @ \`${version}\` ${types}\n`;
        });
        markdown += '\n';
      }

      if (peerDeps.length > 0) {
        markdown += `## 🔗 Peer Dependencies (${peerDeps.length})\n`;
        peerDeps.forEach(dep => {
          const version = dep.resolvedVersion || dep.version || 'unknown';
          markdown += `- **${dep.name}** @ \`${version}\`\n`;
        });
        markdown += '\n';
      }

      markdown += `> **💡 Legend**: 📝 = TypeScript types included\n`;
      markdown += `> **🤖 Tip**: Use \`get_dependency\` for more details on a specific package.`;

      return this.createResponse(markdown);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
