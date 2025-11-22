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

      const config = this.getConfig(args.projectPath);

      const version = dependency.resolvedVersion || dependency.version || 'unknown';
      const typeEmoji = dependency.type === 'devDependency' ? '🛠️' : dependency.type === 'peerDependency' ? '🔗' : '📦';

      let markdown = `# ${typeEmoji} ${dependency.name} v${version}\n\n`;

      markdown += `## 📋 Package Info\n`;
      markdown += `- **Type**: ${dependency.type}\n`;
      markdown += `- **Location**: \`${dependency.location || 'N/A'}\`\n`;
      markdown += `- **TypeScript**: ${dependency.hasTypes ? '✅ Yes' : '❌ No'}\n`;

      if (dependency.description) {
        markdown += `\n> ${dependency.description}\n`;
      }

      markdown += `\n## 💡 Why use this?\n`;
      markdown += `- **Source Code**: Read \`${dependency.location}/index.js\` to understand implementation.\n`;
      if (dependency.hasTypes) {
        markdown += `- **Type Definitions**: Check \`${dependency.typesLocation || 'index.d.ts'}\` for API signatures.\n`;
      }
      markdown += `- **Usage**: Search for \`"${dependency.name}"\` in your codebase to see how it's used.\n`;

      markdown += `\n## 📚 Documentation Links\n`;
      if (dependency.docsUrl) markdown += `- [Custom Docs](${dependency.docsUrl})\n`;
      if (dependency.homepage) markdown += `- [Homepage](${dependency.homepage})\n`;
      if (dependency.repository) markdown += `- [Repository](${dependency.repository})\n`;

      return this.createResponse(markdown);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
