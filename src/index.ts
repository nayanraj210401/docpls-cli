import * as fs from 'fs';
import * as path from 'path';
import { DetectorRegistry, NodeDetector, PythonDetector } from './detectors';
import { ParserRegistry, PackageJsonParser, EnhancedParserFactory } from './parsers';
import { JsonFileStore } from './storage';
import { Project, ProjectType, Dependency } from './types';

export class DocPlsCLI {
  private detectorRegistry: DetectorRegistry;
  private parserRegistry: ParserRegistry;
  private store: JsonFileStore;
  private packageJsonParser: PackageJsonParser;
  private enhancedParser: any; // EnhancedDependencyParser

  constructor() {
    this.detectorRegistry = new DetectorRegistry();
    this.parserRegistry = new ParserRegistry();
    this.store = new JsonFileStore();
    this.packageJsonParser = new PackageJsonParser();
    this.enhancedParser = EnhancedParserFactory.create();
  }

  async init(projectPath: string = process.cwd()): Promise<void> {
    const resolvedPath = path.resolve(projectPath);
    
    console.log(`Analyzing project at: ${resolvedPath}`);
    
    const projectType = this.detectorRegistry.detectProject(resolvedPath);
    if (projectType === ProjectType.UNKNOWN) {
      console.log('No supported project type detected');
      return;
    }
    
    console.log(`Detected project type: ${projectType}`);
    
    const project = await this.analyzeProject(resolvedPath, projectType);
    await this.store.saveProject(project);
    
    console.log(`Found ${project.dependencies.length} dependencies`);
    console.log('Project analysis complete!');
  }

  async list(projectPath?: string): Promise<void> {
    const projects = await this.store.listProjects();
    
    if (projects.length === 0) {
      console.log('No projects analyzed yet. Use "docpls-cli init" first.');
      return;
    }
    
    let project: Project | null = null;
    
    if (projectPath) {
      const resolvedPath = path.resolve(projectPath);
      project = await this.store.getProject(resolvedPath);
    } else {
      project = projects[0];
    }
    
    if (!project) {
      console.log('Project not found');
      return;
    }
    
    console.log(`\nDependencies for ${project.path} (${project.type}):`);
    console.log('='.repeat(50));
    
    const installedDeps = project.dependencies.filter(d => d.isInstalled);
    const missingDeps = project.dependencies.filter(d => !d.isInstalled);
    
    if (installedDeps.length > 0) {
      console.log('\n📦 Installed Dependencies:');
      installedDeps.forEach(dep => {
        const typeIcon = dep.type === 'devDependency' ? '🛠️' : dep.type === 'peerDependency' ? '🔗' : '📦';
        const typesIcon = dep.hasTypes ? '📝' : '';
        const version = dep.resolvedVersion || dep.version || 'unknown';
        console.log(`  ${typeIcon} ${dep.name}@${version} ${typesIcon}`);
        if (dep.docsUrl) {
          console.log(`     📚 ${dep.docsUrl}`);
        }
      });
    }
    
    if (missingDeps.length > 0) {
      console.log('\n❌ Missing Dependencies:');
      missingDeps.forEach(dep => {
        const typeIcon = dep.type === 'devDependency' ? '🛠️' : dep.type === 'peerDependency' ? '🔗' : '📦';
        console.log(`  ${typeIcon} ${dep.name}@${dep.version} (not installed)`);
      });
    }
    
    console.log(`\nTotal: ${installedDeps.length} installed, ${missingDeps.length} missing`);
  }

  async watch(projectPath: string = process.cwd()): Promise<void> {
    const resolvedPath = path.resolve(projectPath);
    
    console.log(`Watching for changes in: ${resolvedPath}`);
    console.log('Press Ctrl+C to stop watching');

    const detector = this.detectorRegistry.getDetector(ProjectType.NODE, resolvedPath);
    if (!detector) {
      console.error('No detector found for project type');
      return;
    }

    const filesToWatch = [
      ...detector.getManifestFiles(),
      ...detector.getLockFiles()
    ];

    const chokidar = require('chokidar');
    
    const watcher = chokidar.watch(filesToWatch.map(file => 
      path.join(resolvedPath, file)
    ), {
      ignoreInitial: true,
      persistent: true
    });

    watcher.on('change', async (filePath: string) => {
      console.log(`\nFile changed: ${path.basename(filePath)}`);
      console.log('Re-analyzing project...');
      
      const projectType = this.detectorRegistry.detectProject(resolvedPath);
      const project = await this.analyzeProject(resolvedPath, projectType);
      await this.store.saveProject(project);
      
      console.log(`Updated: ${project.dependencies.length} dependencies`);
    });

    watcher.on('add', async (filePath: string) => {
      console.log(`\nFile added: ${path.basename(filePath)}`);
      console.log('Re-analyzing project...');
      
      const projectType = this.detectorRegistry.detectProject(resolvedPath);
      const project = await this.analyzeProject(resolvedPath, projectType);
      await this.store.saveProject(project);
      
      console.log(`Updated: ${project.dependencies.length} dependencies`);
    });

    // Keep the process running
    process.stdin.resume();
  }

  async addDocs(dependencyName: string, docsUrl: string): Promise<void> {
    await this.store.updateDocumentationUrl(dependencyName, docsUrl);
    console.log(`Added documentation URL for ${dependencyName}: ${docsUrl}`);
  }

  async listProjects(): Promise<void> {
    const projects = await this.store.listProjects();
    
    if (projects.length === 0) {
      console.log('No projects analyzed yet. Use "docpls-cli init" first.');
      return;
    }
    
    console.log('\nTracked Projects:');
    console.log('='.repeat(30));
    
    projects.forEach(project => {
      const lastAnalyzed = project.lastAnalyzed.toLocaleDateString();
      const monoRepoIcon = project.isMonoRepo ? '📁' : '📦';
      console.log(`${monoRepoIcon} ${project.path} (${project.type})`);
      console.log(`   Dependencies: ${project.dependencies.length}`);
      console.log(`   Last analyzed: ${lastAnalyzed}`);
      if (project.workspaces && project.workspaces.length > 0) {
        console.log(`   Workspaces: ${project.workspaces.join(', ')}`);
      }
      console.log('');
    });
  }

  async remove(projectPath: string): Promise<void> {
    const resolvedPath = path.resolve(projectPath);
    await this.store.removeProject(resolvedPath);
    console.log(`Removed project: ${resolvedPath}`);
  }

  async info(projectPath?: string): Promise<void> {
    const projects = await this.store.listProjects();
    
    if (projects.length === 0) {
      console.log('No projects analyzed yet. Use "docpls-cli init" first.');
      return;
    }
    
    let project: Project | null = null;
    
    if (projectPath) {
      const resolvedPath = path.resolve(projectPath);
      project = await this.store.getProject(resolvedPath);
    } else {
      project = projects[0];
    }
    
    if (!project) {
      console.log('Project not found');
      return;
    }
    
    console.log(`\nProject Information: ${project.path}`);
    console.log('='.repeat(50));
    console.log(`Type: ${project.type}`);
    console.log(`Dependencies: ${project.dependencies.length}`);
    console.log(`Last analyzed: ${project.lastAnalyzed.toLocaleString()}`);
    
    if (project.isMonoRepo) {
      console.log(`Mono-repo: Yes`);
    }
    
    if (project.workspaces && project.workspaces.length > 0) {
      console.log(`Workspaces: ${project.workspaces.join(', ')}`);
    }
    
    console.log(`\nManifest files: ${project.manifestFiles.join(', ')}`);
    console.log(`Lock files: ${project.lockFiles.join(', ')}`);
    
    // Dependency statistics
    const stats = {
      total: project.dependencies.length,
      installed: project.dependencies.filter(d => d.isInstalled).length,
      withTypes: project.dependencies.filter(d => d.hasTypes).length,
      production: project.dependencies.filter(d => d.type === 'dependency').length,
      dev: project.dependencies.filter(d => d.type === 'devDependency').length,
      peer: project.dependencies.filter(d => d.type === 'peerDependency').length
    };
    
    console.log(`\nDependency Statistics:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Installed: ${stats.installed}`);
    console.log(`  With TypeScript types: ${stats.withTypes}`);
    console.log(`  Production: ${stats.production}`);
    console.log(`  Development: ${stats.dev}`);
    console.log(`  Peer: ${stats.peer}`);
  }

  private async analyzeProject(projectPath: string, projectType: ProjectType): Promise<Project> {
    const detector = this.detectorRegistry.getDetector(projectType, projectPath);
    if (!detector) {
      throw new Error(`No detector found for project type: ${projectType}`);
    }

    const manifestFiles = detector.getManifestFiles();
    const lockFiles = detector.getLockFiles();
    
    let dependencies: Dependency[] = [];
    let isMonoRepo = false;
    let workspaces: string[] = [];

    // For Node.js projects, use enhanced parsing
    if (projectType === ProjectType.NODE) {
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        isMonoRepo = this.packageJsonParser.isMonoRepo(packageJsonPath);
        
        if (isMonoRepo) {
          console.log('  📁 Detected mono-repo, scanning all package.json files...');
          dependencies = this.packageJsonParser.getAllDependencies(projectPath);
        } else {
          // Use enhanced parsing with all strategies (package.json, lock files, node_modules)
          console.log('  🔍 Using enhanced dependency parsing...');
          dependencies = await this.enhancedParser.parseProject(projectPath, projectType);
        }
      }
    } else if (projectType === ProjectType.PYTHON) {
      // Use enhanced parsing for Python projects
      console.log('  🐍 Using enhanced Python dependency parsing...');
      dependencies = await this.enhancedParser.parseProject(projectPath, projectType);
    } else {
      // For other project types, use regular parsing
      for (const manifestFile of manifestFiles) {
        const filePath = path.join(projectPath, manifestFile);
        if (fs.existsSync(filePath)) {
          const fileDependencies = this.parserRegistry.parseFile(filePath);
          dependencies.push(...fileDependencies);
        }
      }
    }

    return {
      path: projectPath,
      type: projectType,
      manifestFiles: manifestFiles.filter(file => fs.existsSync(path.join(projectPath, file))),
      lockFiles: lockFiles.filter(file => fs.existsSync(path.join(projectPath, file))),
      dependencies,
      lastAnalyzed: new Date(),
      isMonoRepo,
      workspaces
    };
  }

  getStorage() {
    return this.store;
  }
}
