import { BaseTool } from './base';
import { QueryArgs, ToolResponse } from '../types/index';
import { Dependency } from '../../types';

export class QueryTool extends BaseTool {

  async execute(args: QueryArgs): Promise<ToolResponse> {
    try {
      const project = await this.getProject(args.projectPath);

      switch (args.type || 'dependency') {
        case 'dependency':
          return await this.queryDependencies(project, args);
        case 'keyword':
          return await this.queryKeywords(project, args);
        default:
          return await this.queryDependencies(project, args);
      }
    } catch (error) {
      return this.createErrorResponse(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async queryDependencies(project: any, args: QueryArgs): Promise<ToolResponse> {
    let dependencies = project.dependencies;

    // Apply filters
    if (args.filters?.dependencyType) {
      dependencies = dependencies.filter((dep: Dependency) => dep.type === args.filters?.dependencyType);
    }

    // Search by name
    const searchTerm = args.query.toLowerCase();
    const caseSensitive = args.filters?.caseSensitive || false;

    const matches = dependencies.filter((dep: Dependency) => {
      const name = caseSensitive ? dep.name : dep.name.toLowerCase();
      const query = caseSensitive ? args.query : searchTerm;

      if (args.filters?.exactMatch) {
        return name === query;
      } else {
        return name.includes(query);
      }
    });

    const config = this.getConfig(args.projectPath);

    // Always return Markdown format for agents
    return this.createResponse(this.formatDependencyMarkdown(matches, args.query));
  }

  private formatDependencyMarkdown(matches: Dependency[], query: string): string {
    if (matches.length === 0) {
      return `No dependencies found matching "${query}".\n\n### � Suggested Action\n- **Check Spelling**: Ensure the package name is correct.\n- **List All**: Use \`list_dependencies\` to see what is available.\n- **Broaden Search**: Try a shorter keyword.`;
    }

    let markdown = `# Search Results: "${query}"\n\n`;
    markdown += `Found ${matches.length} match${matches.length === 1 ? '' : 'es'}.\n\n`;

    matches.forEach(dep => {
      const version = dep.resolvedVersion || dep.version || 'unknown';
      const typeEmoji = dep.type === 'devDependency' ? '🛠️' : '📦';

      markdown += `## ${typeEmoji} ${dep.name} (${version})\n`;
      markdown += `- **Type**: ${dep.type}\n`;

      if (dep.docsUrl) {
        markdown += `- **Docs**: ${dep.docsUrl}\n`;
      }

      markdown += `\n**Next Steps**:\n`;
      markdown += `- ℹ️ Details: \`get_dependency(name="${dep.name}")\`\n`;
      if (dep.hasTypes) {
        markdown += `- 📝 Types: \`get_dependency\` (check typesLocation)\n`;
      }
      markdown += `\n---\n\n`;
    });

    return markdown;
  }

  private async queryKeywords(project: any, args: QueryArgs): Promise<ToolResponse> {
    const dependencies = project.dependencies;
    const searchTerm = args.query.toLowerCase();
    const matches: any[] = [];

    for (const dep of dependencies) {
      let found = false;
      let matchType = '';

      // Search in dependency name
      if (dep.name.toLowerCase().includes(searchTerm)) {
        found = true;
        matchType = 'name';
      }

      // Search in documentation URL if available
      if (dep.sourceLocation && dep.sourceLocation.toLowerCase().includes(searchTerm)) {
        found = true;
        matchType = 'documentation';
      }

      if (found) {
        matches.push({
          name: dep.name,
          version: dep.version,
          type: dep.type,
          matchType,
          location: dep.location,
          docsUrl: dep.sourceLocation
        });
      }
    }

    const config = this.getConfig(args.projectPath);

    // Always return Markdown format for agents
    return this.createResponse(this.formatDependencyMarkdown(matches as Dependency[], args.query));
  }
}
