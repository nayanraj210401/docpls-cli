# DocsPls CLI

A powerful command-line interface for managing and documenting project dependencies with MCP (Model Context Protocol) server integration.

## What DocsPls CLI Does

DocsPls CLI helps you:
- Initialize and analyze projects
- Track and manage project dependencies
- Add and view documentation URLs for dependencies
- Monitor project changes in real-time
- Integrate with MCP (Model Context Protocol) for enhanced functionality

## Installation

```bash
npm install -g docspls-cli
```

## Basic Usage

### Initialize a Project
Initialize and analyze a project in the current directory:
```bash
docspls init [project-path]
```

### List Dependencies
List all dependencies in a project:
```bash
docspls list -p <project-path>
```

### Watch for Changes
Watch for changes in project files:
```bash
docspls watch [project-path]
```

### Add Documentation URL
Add custom documentation URL for a dependency:
```bash
docspls add-docs <dependency-name> <docs-url>
```

### List Tracked Projects
Show all tracked projects:
```bash
docspls projects
```

### Remove Project
Remove a project from tracking:
```bash
docspls remove <project-path>
```

### Show Project Info
Show detailed information about a project:
```bash
docspls info [project-path]
```

## MCP Server Integration

DocsPls CLI provides an MCP (Model Context Protocol) server that can be integrated with IDEs and other tools. The MCP server is started using the `mcp` command and provides programmatic access to the CLI's functionality.

### Starting the MCP Server

```bash
docspls mcp
```

### IDE Integration

To integrate with your IDE, add the following configuration to your IDE's MCP settings:

```json
"mcpServers": {
  "docpls": {
    "args": ["-y", "docspls-cli", "mcp"],
    "command": "npx",
    "disabled": false,
    "env": {}
  }
}
```

### Available MCP Endpoints

The MCP server exposes the following functionality:
- Project initialization and analysis
- Dependency listing and management
- Documentation URL management
- Project monitoring
- Project information retrieval

## Configuration

Create a `.docsplsrc` file in your project root to customize the CLI behavior:

```json
{
  "mcpServer": "https://your-mcp-server.com",
  "defaultDocumentationFormat": "markdown",
  "autoUpdate": true
}
```

