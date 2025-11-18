# DocsPls CLI

[![npm version](https://img.shields.io/npm/v/docspls-cli.svg?style=flat-square)](https://www.npmjs.com/package/docspls-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](https://www.typescriptlang.org/)

A powerful command-line interface for managing and tracking project dependencies with intelligent documentation discovery and search capabilities. DocPls CLI helps developers maintain better documentation hygiene by providing tools to discover, track, and search through project dependencies and their documentation.

## ✨ Features

- 🔍 **Smart Dependency Discovery**: Automatically detects and analyzes project dependencies
- 📚 **Documentation Tracking**: Keep track of documentation URLs for all your dependencies
- ⚡ **Fast Search**: Quickly find dependencies and their documentation
- 🔄 **Real-time Updates**: Watch for changes in your project and update documentation automatically
- 📦 **Multi-package Support**: Works with npm, Yarn, pnpm, and Python projects
- 🛠 **Extensible**: Built with TypeScript for type safety and extensibility

## 🚀 Installation

1. Install the CLI globally:
   ```bash
   npm install -g docspls-cli
   ```

   Or use with npx:
   ```bash
   npx docspls-cli [command]
   ```

   Or install it locally in your project:

```bash
npm install --save-dev docspls-cli
```

## 📖 Usage

### Initialize a Project

Analyze and start tracking a project's dependencies:

```bash
docspls init [project-path]
```

If no path is provided, it will analyze the current directory.

### List Dependencies

Show all dependencies in a project with their documentation status:

```bash
docspls list [options]
```

**Options:**
- `-p, --project <path>`: Path to the project directory (default: current directory)
- `--json`: Output in JSON format for programmatic use
- `--no-color`: Disable colored output

### Search Dependencies

Search for dependencies by name or metadata:

```bash
docspls query <search-term> [options]
```

**Search Types:**
- `--type dependency`: Find packages by name (default)
- `--type keyword`: Search dependency names and documentation URLs

**Options:**
- `-p, --project <path>`: Path to the project directory
- `--json`: Output in JSON format

### Watch for Changes

Monitor project files for changes and automatically update dependency information:

```bash
docspls watch [project-path] [options]
```

**Options:**
- `--interval <ms>`: Polling interval in milliseconds (default: 1000)
- `--ignore <patterns>`: Comma-separated list of glob patterns to ignore

### Update Documentation

Add or update documentation URL for a dependency:

```bash
docspls docs:update <dependency-name> <docs-url> [options]
```

**Options:**
- `-p, --project <path>`: Path to the project directory
- `--global`: Update the global configuration

### Configuring MCP Servers

You can configure the MCP servers by creating or editing the `mcp_config.json` file in your project root or home directory:

```json
{
  "mcpServers": {
    "docpls": {
      "args": [
        "-y",
        "@docspls/cli",
        "mcp"
      ],
      "command": "npx",
      "disabled": false,
      "env": {}
    },
  }
}
```

### Using MCP Servers

To start all configured MCP servers:

```bash
docspls mcp:start
```

To start a specific MCP server:

```bash
docspls mcp:start <server-name>
```

To check the status of MCP servers:

```bash
docspls mcp:status
```

## 🔧 Configuration

DocPls CLI can be configured using a `.docplsrc` file in your project root or home directory:

```json
{
  "$schema": "./node_modules/docspls-cli/schema.json",
  "ignorePatterns": ["**/node_modules/**", "**/dist/**"],
  "cacheDir": ".docpls/cache",
  "documentation": {
    "autoUpdate": true,
    "defaultBranch": "main"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to contribute to this project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ and TypeScript
- Inspired by the need for better documentation management in modern development workflows

---

<div align="center">
  Made with ☕ by the DocPls Team
</div>

Add a custom documentation URL for a dependency:

```bash
docspls add-docs <dependency-name> <docs-url>
```

### List Tracked Projects

Show all projects being tracked:

```bash
docspls projects
```

### Remove Project

Stop tracking a project:

```bash
docspls remove <project-path>
```

### Project Information

Show detailed information about a project:

```bash
docspls info [project-path]
```

## Supported Project Types

- **Node.js** - Detects `package.json` and supports `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- **Python** - Detects `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile`

## Data Storage

The CLI stores project data in `~/.docpls/`:
- `projects.json` - Main project database
- Projects are automatically updated when files change

## Examples

```bash
# Initialize current directory
docspls init

# List dependencies in current project
docspls list

# Search for react-related dependencies
docspls query react

# Search in documentation URLs
docspls query "docs" --type keyword

# Add documentation for a specific package
docspls add-docs react https://reactjs.org/docs

# Watch for changes
docspls watch

# Show all tracked projects
docspls projects
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```
