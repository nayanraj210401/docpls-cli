import { ParsingStrategy } from '../strategies/ParsingStrategy';
import { PackageJsonStrategy } from '../strategies/manifests/PackageJsonStrategy';
import { RequirementsStrategy } from '../strategies/manifests/RequirementsStrategy';
import { PyProjectStrategy } from '../strategies/manifests/PyProjectStrategy';
import { PackageLockStrategy } from '../strategies/lockfiles/PackageLockStrategy';
import { YarnLockStrategy } from '../strategies/lockfiles/YarnLockStrategy';
import { PnpmLockStrategy } from '../strategies/lockfiles/PnpmLockStrategy';
import { PipfileLockStrategy } from '../strategies/lockfiles/PipfileLockStrategy';
import { PoetryLockStrategy } from '../strategies/lockfiles/PoetryLockStrategy';
import { CondaEnvironmentStrategy } from '../strategies/lockfiles/CondaEnvironmentStrategy';
import { NodeModulesStrategy } from '../strategies/installed/NodeModulesStrategy';
import { SitePackagesStrategy } from '../strategies/installed/SitePackagesStrategy';

export class StrategyFactory {
  /**
   * Create all available parsing strategies
   */
  static createAllStrategies(): ParsingStrategy[] {
    return [
      // Manifest strategies (priority 1)
      new PackageJsonStrategy(),
      new RequirementsStrategy(),
      new PyProjectStrategy(),
      
      // Lock file strategies (priority 2)
      new PackageLockStrategy(),
      new YarnLockStrategy(),
      new PnpmLockStrategy(),
      new PipfileLockStrategy(),
      new PoetryLockStrategy(),
      new CondaEnvironmentStrategy(),
      
      // Installed module strategies (priority 3)
      new NodeModulesStrategy(),
      new SitePackagesStrategy()
    ];
  }

  /**
   * Create strategies for Node.js projects
   */
  static createNodeStrategies(): ParsingStrategy[] {
    return [
      new PackageJsonStrategy(),
      new PackageLockStrategy(),
      new YarnLockStrategy(),
      new PnpmLockStrategy(),
      new NodeModulesStrategy()
    ];
  }

  /**
   * Create strategies for Python projects
   */
  static createPythonStrategies(): ParsingStrategy[] {
    return [
      new RequirementsStrategy(),
      new PyProjectStrategy(),
      new PipfileLockStrategy(),
      new PoetryLockStrategy(),
      new CondaEnvironmentStrategy(),
      new SitePackagesStrategy()
    ];
  }

  /**
   * Create strategy by file type
   */
  static createStrategyForFile(filePath: string): ParsingStrategy | null {
    const strategies = this.createAllStrategies();
    
    for (const strategy of strategies) {
      if (strategy.canHandle(filePath)) {
        return strategy;
      }
    }
    
    return null;
  }
}
