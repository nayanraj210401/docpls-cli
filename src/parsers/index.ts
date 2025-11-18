import { DependencyParser, Dependency, ProjectType } from '../types';
import { PackageJsonParser } from './PackageJsonParser';
import { RequirementsParser } from './RequirementsParser';
import { NodeModulesResolverImpl } from './NodeModulesResolver';
import { EnhancedDependencyParser } from './EnhancedDependencyParser';
import { ParsingChain } from './core/ParsingChain';
import { StrategyFactory } from './core/StrategyFactory';

// Legacy parser registry for backward compatibility
export class ParserRegistry {
  private parsers: DependencyParser[] = [
    new PackageJsonParser(),
    new RequirementsParser()
  ];

  getParser(fileName: string): DependencyParser | null {
    return this.parsers.find(parser => parser.supports(fileName)) || null;
  }

  parseFile(filePath: string): any[] {
    const fileName = filePath.split('/').pop() || '';
    const parser = this.getParser(fileName);

    if (!parser) {
      console.warn(`No parser found for file: ${fileName}`);
      return [];
    }

    return parser.parse(filePath);
  }

  // Enhanced method for parsing with lock file support
  parseFileWithLocks(filePath: string, lockFiles: string[]): any[] {
    const fileName = filePath.split('/').pop() || '';
    const parser = this.getParser(fileName);

    if (!parser) {
      console.warn(`No parser found for file: ${fileName}`);
      return [];
    }

    // Check if it's PackageJsonParser and use enhanced method
    if (parser instanceof PackageJsonParser) {
      return parser.parseWithLockFile(filePath, lockFiles);
    }

    return parser.parse(filePath);
  }
}

// New enhanced parser factory
export class EnhancedParserFactory {
  static create(projectType?: ProjectType): EnhancedDependencyParser {
    if (projectType) {
      return EnhancedDependencyParser.createForProjectType(projectType);
    }
    return new EnhancedDependencyParser();
  }

  static createCustom(strategies: any[]): EnhancedDependencyParser {
    const parser = new EnhancedDependencyParser();
    const chain = new ParsingChain();
    strategies.forEach(strategy => chain.addStrategy(strategy));
    (parser as any).parsingChain = chain;
    return parser;
  }
}

// Legacy exports
export { PackageJsonParser, RequirementsParser, NodeModulesResolverImpl };

// New enhanced exports
export { EnhancedDependencyParser, ParsingChain, StrategyFactory };
export * from './strategies/ParsingStrategy';
export * from './strategies/manifests/PackageJsonStrategy';
export * from './strategies/manifests/RequirementsStrategy';
export * from './strategies/manifests/PyProjectStrategy';
export * from './strategies/lockfiles/PackageLockStrategy';
export * from './strategies/lockfiles/YarnLockStrategy';
export * from './strategies/lockfiles/PnpmLockStrategy';
export * from './strategies/lockfiles/PipfileLockStrategy';
export * from './strategies/lockfiles/PoetryLockStrategy';
export * from './strategies/lockfiles/CondaEnvironmentStrategy';
export * from './strategies/installed/NodeModulesStrategy';
export * from './strategies/installed/SitePackagesStrategy';
