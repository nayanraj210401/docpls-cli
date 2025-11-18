import { ProjectDetector, ProjectType } from '../types';
import { NodeDetector } from './NodeDetector';
import { PythonDetector } from './PythonDetector';

export class DetectorRegistry {
  private detectors: ProjectDetector[] = [
    new NodeDetector(),
    new PythonDetector()
  ];
  
  detectProject(projectPath: string): ProjectType {
    for (const detector of this.detectors) {
      const type = detector.detect(projectPath);
      if (type) {
        return type;
      }
    }
    return ProjectType.UNKNOWN;
  }
  
  getDetector(projectType: ProjectType, projectPath: string): ProjectDetector | null {
    return this.detectors.find(d => d.detect(projectPath) === projectType) || null;
  }
}

export { NodeDetector, PythonDetector };
