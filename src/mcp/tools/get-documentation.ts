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

      const config = this.getConfig(args.projectPath);

      let markdown = `# 📚 Documentation: ${dependency.name}\n\n`;

      if (dependency.docsUrl) {
        markdown += `## 🌟 Custom Documentation\n`;
        markdown += `[${dependency.docsUrl}](${dependency.docsUrl})\n\n`;
      }

      if (dependency.homepage) {
        markdown += `## 🏠 Homepage\n`;
        markdown += `[${dependency.homepage}](${dependency.homepage})\n\n`;
      }

      if (dependency.repository) {
        markdown += `## 📦 Repository\n`;
        markdown += `[${dependency.repository}](${dependency.repository})\n\n`;
      }

      markdown += `## 📖 Recommended Sections\n`;
      markdown += `- [API Reference](${dependency.homepage || dependency.docsUrl}/api)\n`;
      markdown += `- [Getting Started](${dependency.homepage || dependency.docsUrl}/getting-started)\n`;
      markdown += `- [Examples](${dependency.homepage || dependency.docsUrl}/examples)\n`;

      markdown += `\n> **💡 Tip**: If the links above are broken, try searching the repository directly.`;

      return this.createResponse(markdown);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : String(error));
    }
  }
}
