# MCP Server Structure

This directory contains the MCP (Model Context Protocol) server implementation for DocPls CLI.

## Directory Structure

```
mcp/
├── server.ts              # Main MCP server class
├── types/                 # MCP-specific type definitions
│   └── index.ts          # Tool arguments, responses, and interfaces
├── tools/                # Individual tool implementations
│   ├── base.ts          # Base tool class with common functionality
│   ├── index.ts         # Tool registry and definitions
│   ├── list-dependencies.ts
│   ├── get-dependency.ts
│   ├── get-documentation.ts
│   ├── update-documentation.ts
│   └── get-project-info.ts
├── utils/                # Utility functions
│   └── index.ts         # Helper functions for data processing
└── README.md            # This file
```

## Architecture

### Base Tool Class
All tools extend the `BaseTool` class which provides:
- Common error handling
- Project retrieval utilities
- Response formatting
- Dependency lookup helpers

### Tool Registry
The `ToolRegistry` class manages:
- Tool registration
- Tool discovery
- Tool definitions for MCP schema

### Individual Tools
Each tool is implemented as a separate class:
- `ListDependenciesTool` - Lists project dependencies
- `GetDependencyTool` - Gets detailed dependency info
- `GetDocumentationTool` - Gets documentation URLs
- `UpdateDocumentationTool` - Updates documentation URLs
- `GetProjectInfoTool` - Gets project information

### Types
Type definitions for:
- Tool arguments and responses
- Dependency information
- Documentation metadata
- Project metadata

### Utils
Helper functions for:
- String formatting and validation
- URL validation
- Dependency type detection
- Repository extraction

## Adding New Tools

1. Create a new tool class extending `BaseTool`:
```typescript
export class NewTool extends BaseTool {
  async execute(args: NewToolArgs): Promise<ToolResponse> {
    // Implementation
  }
}
```

2. Add type definitions in `types/index.ts`

3. Register the tool in `tools/index.ts`:
```typescript
this.tools.set('new_tool', new NewTool(cli));
```

4. Add tool definition to `getToolDefinitions()` in `tools/index.ts`

## Benefits of This Structure

- **Modularity**: Each tool is isolated and independently testable
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new tools and utilities
- **Type Safety**: Comprehensive TypeScript types
- **Reusability**: Common functionality in base classes and utilities
