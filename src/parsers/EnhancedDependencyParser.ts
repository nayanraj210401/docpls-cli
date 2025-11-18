import { Dependency, ProjectType } from '../types';
import { ParsingChain } from './core/ParsingChain';
import { StrategyFactory } from './core/StrategyFactory';

export class EnhancedDependencyParser {
  private parsingChain: ParsingChain;

  constructor() {
    this.parsingChain = new ParsingChain();
    
    // Add all available strategies
    const strategies = StrategyFactory.createAllStrategies();
    strategies.forEach(strategy => this.parsingChain.addStrategy(strategy));
  }

  /**
   * Parse a project using the enhanced strategy-based approach
   */
  async parseProject(projectPath: string, projectType: ProjectType): Promise<Dependency[]> {
    return await this.parsingChain.parseProject(projectPath, projectType);
  }

  /**
   * Create a parser with specific strategies for a project type
   */
  static createForProjectType(projectType: ProjectType): EnhancedDependencyParser {
    const parser = new EnhancedDependencyParser();
    const parsingChain = new ParsingChain();
    
    // Add strategies based on project type
    let strategies: any[];
    
    switch (projectType) {
      case ProjectType.NODE:
        strategies = StrategyFactory.createNodeStrategies();
        break;
      case ProjectType.PYTHON:
        strategies = StrategyFactory.createPythonStrategies();
        break;
      default:
        strategies = StrategyFactory.createAllStrategies();
    }
    
    strategies.forEach(strategy => parsingChain.addStrategy(strategy));
    
    // Replace the parsing chain (reflection or create new instance)
    (parser as any).parsingChain = parsingChain;
    
    return parser;
  }
}
