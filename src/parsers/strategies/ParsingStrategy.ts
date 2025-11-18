import { Dependency } from '../../types';

export interface ParsingStrategy {
  /**
   * Check if this strategy can handle the given file/directory
   */
  canHandle(filePath: string): boolean;
  
  /**
   * Parse the file/directory and extract dependencies
   * Can be either sync or async
   */
  parse(filePath: string): Dependency[] | Promise<Dependency[]>;
  
  /**
   * Priority of this strategy (higher = tried first)
   */
  priority: number;
  
  /**
   * Strategy name for debugging
   */
  readonly name: string;
}
