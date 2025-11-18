# DocPls CLI

A lightweight CLI tool for dependency management and documentation tracking with focused search capabilities.

## Installation

```bash
npm install -g docpls-cli
```

## Usage

### Initialize a Project

Analyze and start tracking a project:

```bash
docpls-cli init [project-path]
```

If no path is provided, it will analyze the current directory.

### List Dependencies

Show all dependencies in a project:

```bash
docpls-cli list [-p, --project <path>]
```

### Search Dependencies

Search for dependencies by name or metadata:

```bash
docpls-cli query <search-term> [--type dependency|keyword] [--project <path>]
```

- **dependency search**: Find packages by name (default)
- **keyword search**: Search dependency names and documentation URLs

### Watch for Changes

Monitor project files for changes and automatically update dependency information:

```bash
docpls-cli watch [project-path]
```

### Add Documentation URL

Add a custom documentation URL for a dependency:

```bash
docpls-cli add-docs <dependency-name> <docs-url>
```

### List Tracked Projects

Show all projects being tracked:

```bash
docpls-cli projects
```

### Remove Project

Stop tracking a project:

```bash
docpls-cli remove <project-path>
```

### Project Information

Show detailed information about a project:

```bash
docpls-cli info [project-path]
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
docpls-cli init

# List dependencies in current project
docpls-cli list

# Search for react-related dependencies
docpls-cli query react

# Search in documentation URLs
docpls-cli query "docs" --type keyword

# Add documentation for a specific package
docpls-cli add-docs react https://reactjs.org/docs

# Watch for changes
docpls-cli watch

# Show all tracked projects
docpls-cli projects
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
