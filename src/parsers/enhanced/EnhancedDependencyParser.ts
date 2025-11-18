import { Dependency, ProjectType } from '../../types';
import { StrategyFactory } from '../core/StrategyFactory';
import { ParsingChain } from '../core/ParsingChain';

/**
 * Enhanced dependency parser that uses strategy pattern and chain of responsibility
 * to parse dependencies from various sources (manifests, lock files, installed modules)
 */
export class EnhancedDependencyParser {
  private parsingChain: ParsingChain;

  constructor() {
    // Initialize parsing chain with all available strategies
    this.parsingChain = new ParsingChain();
    const strategies = StrategyFactory.createAllStrategies();
    
    // Add all strategies to the chain (they'll be sorted by priority)
    for (const strategy of strategies) {
      this.parsingChain.addStrategy(strategy);
    }
  }

  /**
   * Parse a project directory using project-specific strategies
   */
  async parseProject(projectPath: string, projectType: ProjectType): Promise<Dependency[]> {
    // Create a new parsing chain with project-specific strategies for better performance
    const chain = new ParsingChain();
    
    let strategies;
    if (projectType === ProjectType.NODE) {
      strategies = StrategyFactory.createNodeStrategies();
    } else if (projectType === ProjectType.PYTHON) {
      strategies = StrategyFactory.createPythonStrategies();
    } else {
      // Fallback to all strategies for unknown project types
      strategies = StrategyFactory.createAllStrategies();
    }

    // Add project-specific strategies to the chain
    for (const strategy of strategies) {
      chain.addStrategy(strategy);
    }

    // Parse the project using the strategy chain
    return chain.parseProject(projectPath, projectType);
  }

  /**
   * Parse a project using all available strategies (for discovery mode)
   */
  async parseProjectWithAllStrategies(projectPath: string): Promise<Dependency[]> {
    return this.parsingChain.parseProject(projectPath, ProjectType.UNKNOWN);
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
