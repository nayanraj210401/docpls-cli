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

    return this.createResponse({
      queryType: 'dependency',
      searchTerm: args.query,
      totalMatches: matches.length,
      matches: matches.map((dep: Dependency) => ({
        name: dep.name,
        version: dep.version,
        type: dep.type,
        location: dep.location,
        hasTypes: dep.hasTypes,
        docsUrl: dep.sourceLocation
      }))
    });
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

    return this.createResponse({
      queryType: 'keyword',
      searchTerm: args.query,
      totalMatches: matches.length,
      matches
    });
  }




}
