# DocPls Simple Architecture Plan

## 🎯 Overview

Simplify DocPls from complex vector-based system to lightweight CLI + MCP server approach focused on dependency mapping and documentation URLs.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CLI Tool      │────▶│  Local Store     │────▶│  MCP Server     │
│  (docpls-cli)   │     │ (JSON files)     │     │ (Simple Tools)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Project Files   │     │  Dependency Map  │     │  AI Assistants  │
│ (package.json,  │     │  + Metadata      │     │ (Claude, etc.)  │
│ requirements)   │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 📁 New Structure

```
docpls-mcp-server-simple/
├── cli/
│   ├── src/
│   │   ├── detectors/           # Project type detectors
│   │   │   ├── NodeDetector.ts
│   │   │   ├── PythonDetector.ts
│   │   │   ├── RustDetector.ts
│   │   │   └── index.ts
│   │   ├── parsers/             # Lock file parsers
│   │   │   ├── PackageJsonParser.ts
│   │   │   ├── RequirementsParser.ts
│   │   │   ├── CargoLockParser.ts
│   │   │   └── index.ts
│   │   ├── store/               # Local storage management
│   │   │   ├── LocalStore.ts
│   │   │   └── types.ts
│   │   ├── watchers/            # File watchers
│   │   │   ├── FileWatcher.ts
│   │   │   └── index.ts
│   │   ├── mcp/                 # Built-in MCP server
│   │   │   ├── MCPServer.ts
│   │   │   ├── tools/
│   │   │   │   ├── ListDependencies.ts
│   │   │   │   ├── GetDocumentation.ts
│   │   │   │   ├── UpdateDocumentation.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── cli.ts               # Main CLI entry point
│   │   └── index.ts
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
├── mcp-server/                  # Standalone MCP server (optional)
│   ├── src/
│   │   ├── server.ts            # Standalone MCP server
│   │   ├── index.ts
│   │   └── tools/               # Reuse tools from cli/src/mcp/tools/
│   │       └── index.ts
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
├── shared/
│   ├── src/
│   │   ├── types.ts             # Shared types
│   │   └── constants.ts
│   └── package.json
├── package.json                 # Root package.json
├── README.md
└── tsconfig.json
```

## 🛠️ CLI Tool Specification

### Core Responsibilities

#### 1. Project Detection
```typescript
interface ProjectDetector {
  detect(projectPath: string): ProjectType | null;
  getManifestFiles(): string[];
  getLockFiles(): string[];
}

enum ProjectType {
  NODE = 'node',
  PYTHON = 'python', 
  RUST = 'rust',
  MAVEN = 'maven',
  GRADLE = 'gradle',
  UNKNOWN = 'unknown'
}
```

#### 2. Dependency Analysis
```typescript
interface Dependency {
  name: string;
  version: string;
  type: ProjectType;
  manifestFile: string;
  docsUrl?: string;
  customDocsUrl?: string; // User-provided
  lastModified: string;
}

interface ProjectDependencies {
  projectId: string; // Hash of project path
  projectPath: string;
  projectType: ProjectType;
  dependencies: Dependency[];
  lastUpdated: string;
}
```

#### 3. Local Storage
```typescript
// Store location: ~/.docpls/store/
interface LocalStore {
  saveProject(project: ProjectDependencies): Promise<void>;
  getProject(projectPath: string): Promise<ProjectDependencies | null>;
  getAllProjects(): Promise<ProjectDependencies[]>;
  updateDependencyDocs(projectId: string, depName: string, docsUrl: string): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
}
```

#### 4. Watch Mode
```typescript
interface FileWatcher {
  watch(projectPath: string): void;
  unwatch(projectPath: string): void;
  onManifestChange(callback: (projectPath: string) => void): void;
  onLockFileChange(callback: (projectPath: string) => void): void;
}
```

#### 5. Built-in MCP Server
```typescript
interface MCPServerOptions {
  port?: number;
  host?: string;
  transport?: 'stdio' | 'sse';
}

interface MCPServer {
  start(options?: MCPServerOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
```

### CLI Commands

```bash
# Initialize project (detect and analyze)
docpls-cli init [project-path]

# List all dependencies in current project
docpls-cli list

# Watch for changes
docpls-cli watch [project-path]

# Add custom documentation URL
docpls-cli add-docs <dependency-name> <docs-url>

# Show all tracked projects
docpls-cli projects

# Remove project from tracking
docpls-cli remove [project-path]

# Show project info
docpls-cli info [project-path]

# Start MCP server for AI assistant integration
docpls-cli mcp [--port <port>] [--host <host>]
```

## 🔧 MCP Server Specification

### Two Deployment Options

#### Option 1: Built-in MCP Server (Recommended)
```bash
# Start MCP server from CLI
docpls-cli mcp [--port <port>] [--host <host>]

# Examples:
docpls-cli mcp                    # Default: stdio transport
docpls-cli mcp --port 3000       # HTTP server on port 3000
docpls-cli mcp --host 0.0.0.0    # Bind to all interfaces
```

#### Option 2: Standalone MCP Server
```bash
# Install standalone server
npm install -g docpls-mcp-server

# Run as separate process
docpls-mcp-server

# Or with custom options
docpls-mcp-server --port 3000 --host localhost
```

### Core Tools

#### 1. List Dependencies
```typescript
interface ListDependenciesArgs {
  projectPath?: string; // Optional, defaults to current
  filter?: {
    type?: ProjectType;
    name?: string; // Partial match
  };
}

interface ListDependenciesResult {
  project: {
    path: string;
    type: ProjectType;
  };
  dependencies: Dependency[];
}
```

#### 2. Get Documentation
```typescript
interface GetDocumentationArgs {
  dependencyName: string;
  projectPath?: string;
}

interface GetDocumentationResult {
  dependency: Dependency;
  documentation: {
    officialUrl?: string;
    customUrl?: string;
    recommendedSections?: string[];
  };
}
```

#### 3. Update Documentation
```typescript
interface UpdateDocumentationArgs {
  dependencyName: string;
  docsUrl: string;
  projectPath?: string;
}

interface UpdateDocumentationResult {
  success: boolean;
  dependency: Dependency;
}
```

#### 4. Search Dependencies (Future)
```typescript
interface SearchDependenciesArgs {
  query: string;
  projectPath?: string;
  searchIn?: 'name' | 'docs' | 'both';
}

interface SearchDependenciesResult {
  dependencies: Array<{
    dependency: Dependency;
    matchReason: string;
    matchScore: number;
  }>;
}
```

## 📊 Data Flow

### 1. Initial Analysis
```
CLI detects project type → Parses manifest/lock files → Extracts dependencies → Saves to local store
```

### 2. Watch Mode
```
File watcher detects changes → CLI re-analyzes → Updates local store → MCP server reads updated data
```

### 3. AI Query
```
AI assistant → MCP server → Reads from local store → Returns dependency info + docs URLs
```

## 🎯 Implementation Phases

### Phase 1: Core CLI (Week 1)
- [ ] Project detectors (Node, Python)
- [ ] Basic parsers (package.json, requirements.txt)
- [ ] Local storage implementation
- [ ] Basic CLI commands (init, list)

### Phase 2: Enhanced CLI (Week 2)
- [ ] File watcher implementation
- [ ] Additional project types (Rust, Maven)
- [ ] Custom docs URL management
- [ ] Project management commands
- [ ] Built-in MCP server with basic tools

### Phase 3: MCP Server Enhancement (Week 3)
- [ ] Standalone MCP server setup
- [ ] Advanced MCP tools (search, filtering)
- [ ] Multiple transport support (stdio, HTTP)
- [ ] MCP server configuration and options
- [ ] Integration testing with AI assistants

### Phase 4: Polish & Extensibility (Week 4)
- [ ] Error handling & logging
- [ ] Configuration management
- [ ] Documentation & examples
- [ ] Performance optimizations
- [ ] AI assistant integration guides

## 🔮 Future Extensibility

### Optional Vector Search
```typescript
// Can be added later without breaking existing API
interface EnhancedMCPTools {
  semanticSearch(args: SemanticSearchArgs): Promise<SemanticSearchResult>;
  findSimilarDependencies(args: FindSimilarArgs): Promise<SimilarDependenciesResult>;
}
```

### Cloud Sync
```typescript
interface CloudSync {
  syncToCloud(storePath: string): Promise<void>;
  syncFromCloud(storePath: string): Promise<void>;
  shareProject(projectId: string): Promise<string>; // Returns share link
}
```

### Team Features
```typescript
interface TeamFeatures {
  addTeamMember(email: string): Promise<void>;
  shareDependencyMap(projectId: string, teamId: string): Promise<void>;
  getTeamDependencies(teamId: string): Promise<Dependency[]>;
}
```

## 🧪 Testing Strategy

### Unit Tests
- Each detector and parser
- Local storage operations
- CLI command handlers
- MCP server tools

### Integration Tests
- End-to-end CLI workflow
- MCP server integration
- File watcher functionality
- Cross-platform compatibility

### Performance Tests
- Large dependency sets (1000+ deps)
- Multiple projects tracking
- Watch mode performance
- MCP server response times

## 📝 Success Metrics

### MVP Success Criteria
- [ ] CLI can detect and analyze Node/Python projects
- [ ] MCP server can list dependencies and return docs URLs
- [ ] Watch mode updates dependency changes
- [ ] Users can add custom documentation URLs
- [ ] Built-in MCP server works with `docpls-cli mcp` command
- [ ] Works with Claude Desktop and VSCode Copilot
- [ ] Standalone MCP server can be installed and run independently

### Stretch Goals
- [ ] Support for 5+ project types
- [ ] <100ms response time for MCP queries
- [ ] <1s analysis time for typical projects
- [ ] 100% test coverage
- [ ] Published to npm as installable tools

## 🚀 Next Steps

1. **Create project structure** - Set up `docpls-mcp-server-simple/` folder
2. **Implement Node detector** - Start with most common ecosystem
3. **Build basic CLI** - `init` and `list` commands
4. **Create simple MCP server** - With basic tools
5. **Test integration** - End-to-end workflow validation
6. **Iterate based on feedback** - Add features as needed

This approach prioritizes simplicity and rapid iteration while keeping the door open for advanced features later.
