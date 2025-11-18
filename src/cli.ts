#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { DocPlsCLI } from './index';
import { DocPlsMCPServer } from './mcp/server';

const program = new Command();

program
  .name('docpls-cli')
  .description('DocPls CLI for dependency management and documentation')
  .version('1.0.0');

// Initialize project
program
  .command('init')
  .description('Initialize and analyze a project')
  .argument('[project-path]', 'Path to the project (defaults to current directory)', '.')
  .action(async (projectPath: string) => {
    const cli = new DocPlsCLI();
    await cli.init(projectPath);
  });

// List dependencies
program
  .command('list')
  .description('List all dependencies in the current project')
  .option('-p, --project <path>', 'Path to the project', '.')
  .action(async (options) => {
    const cli = new DocPlsCLI();
    await cli.list(options.project);
  });

// Watch for changes
program
  .command('watch')
  .description('Watch for changes in project files')
  .argument('[project-path]', 'Path to the project (defaults to current directory)', '.')
  .action(async (projectPath: string) => {
    const cli = new DocPlsCLI();
    await cli.watch(projectPath);
  });

// Add documentation URL
program
  .command('add-docs')
  .description('Add custom documentation URL for a dependency')
  .argument('<dependency-name>', 'Name of the dependency')
  .argument('<docs-url>', 'Documentation URL')
  .action(async (dependencyName: string, docsUrl: string) => {
    const cli = new DocPlsCLI();
    await cli.addDocs(dependencyName, docsUrl);
  });

// List projects
program
  .command('projects')
  .description('Show all tracked projects')
  .action(async () => {
    const cli = new DocPlsCLI();
    await cli.listProjects();
  });

// Remove project
program
  .command('remove')
  .description('Remove project from tracking')
  .argument('<project-path>', 'Path to the project to remove')
  .action(async (projectPath: string) => {
    const cli = new DocPlsCLI();
    await cli.remove(projectPath);
  });

// Show project info
program
  .command('info')
  .description('Show detailed information about a project')
  .argument('[project-path]', 'Path to the project (defaults to current directory)', '.')
  .action(async (projectPath: string) => {
    const cli = new DocPlsCLI();
    await cli.info(projectPath);
  });

// Start MCP server
program
  .command('mcp')
  .description('Start MCP server for AI assistant integration')
  .option('--port <port>', 'Port for HTTP server (if supported)')
  .option('--host <host>', 'Host for HTTP server (if supported)')
  .action(async (options) => {
    try {
      console.error('Starting DocPls MCP Server...');
      const server = new DocPlsMCPServer();
      await server.start();
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  });

program.parse();
