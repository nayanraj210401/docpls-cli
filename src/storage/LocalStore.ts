import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LocalStore, Project, Dependency } from '../types';

export class JsonFileStore implements LocalStore {
  private storePath: string;
  private projectsPath: string;
  
  constructor() {
    const homeDir = os.homedir();
    const docplsDir = path.join(homeDir, '.docpls');
    
    // Create .docpls directory if it doesn't exist
    if (!fs.existsSync(docplsDir)) {
      fs.mkdirSync(docplsDir, { recursive: true });
    }
    
    this.storePath = path.join(docplsDir, 'projects.json');
    this.projectsPath = path.join(docplsDir, 'projects');
    
    // Create projects directory if it doesn't exist
    if (!fs.existsSync(this.projectsPath)) {
      fs.mkdirSync(this.projectsPath, { recursive: true });
    }
  }
  
  private loadData(): { [key: string]: Project } {
    try {
      if (!fs.existsSync(this.storePath)) {
        return {};
      }
      
      const content = fs.readFileSync(this.storePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading data from store:', error);
      return {};
    }
  }
  
  private saveData(data: { [key: string]: Project }): void {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving data to store:', error);
      throw error;
    }
  }
  
  async saveProject(project: Project): Promise<void> {
    const data = this.loadData();
    data[project.path] = {
      ...project,
      lastAnalyzed: new Date(project.lastAnalyzed)
    };
    this.saveData(data);
  }
  
  async getProject(projectPath: string): Promise<Project | null> {
    const data = this.loadData();
    const project = data[projectPath];
    
    if (!project) {
      return null;
    }
    
    return {
      ...project,
      lastAnalyzed: new Date(project.lastAnalyzed)
    };
  }
  
  async listProjects(): Promise<Project[]> {
    const data = this.loadData();
    return Object.values(data).map(project => ({
      ...project,
      lastAnalyzed: new Date(project.lastAnalyzed)
    }));
  }
  
  async removeProject(projectPath: string): Promise<void> {
    const data = this.loadData();
    delete data[projectPath];
    this.saveData(data);
  }
  
  async updateDocumentationUrl(dependencyName: string, docsUrl: string): Promise<void> {
    const data = this.loadData();
    
    // Update documentation URL for all projects that contain this dependency
    for (const project of Object.values(data)) {
      const dependency = project.dependencies.find(dep => dep.name === dependencyName);
      if (dependency) {
        dependency.docsUrl = docsUrl;
      }
    }
    
    this.saveData(data);
  }
}
