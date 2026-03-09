# MarkView

Local Markdown Documentation Viewer with workspace management.

## Features

- **Workspace management**: Add any local directory as a workspace. All markdown files under the path and sub-paths are auto-discovered.
- **Branch mode**: Multiple directories can be linked as branches under the same workspace (e.g. different language versions, feature branches, draft vs published).
- **File tree navigation**: Auto-generated sidebar from directory structure.
- **Full-text search**: Server-side content search across all markdown files in a workspace.
- **Markdown rendering**: Built-in renderer with support for headings, tables, code blocks, blockquotes, task lists, links, and inline formatting.
- **In-document navigation**: Anchor links and relative file links resolve within the workspace.
- **Persistent state**: Workspace configurations are saved to `data/workspaces.json`. Last-used workspace is restored on reload (via localStorage).

## Requirements

- Node.js 18+

## Quick Start

```bash
cd markview
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For development with auto-reload:

```bash
npm run dev
```

## Usage

1. Click **+** in the sidebar to add a workspace.
2. Browse to a local directory containing markdown files.
3. Enter a name, select the mode:
   - **Workspace** (default): independent document root
   - **Branch**: grouped under an existing workspace (switch between them via branch tags)
4. Click **Add**. The sidebar populates with discovered markdown files.
5. Use **Cmd+K** to search across all files in the active workspace.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/workspaces` | GET | List all workspaces |
| `/api/workspaces` | POST | Create workspace `{name, rootPath, mode?, parentId?}` |
| `/api/workspaces/:id` | PUT | Update workspace |
| `/api/workspaces/:id` | DELETE | Delete workspace (and its branches) |
| `/api/tree/:workspaceId` | GET | Get file tree for a workspace |
| `/api/file/:workspaceId/*` | GET | Read file content (path-traversal protected) |
| `/api/browse?dir=` | GET | Browse directories for the path picker |
| `/api/search/:workspaceId?q=` | GET | Full-text search across workspace files |

## Project Structure

```
markview/
  server.js           # Express backend (filesystem + workspace API)
  public/
    index.html         # Single-file frontend (forked from docs/viewer.html)
  data/
    workspaces.json    # Persisted workspace configurations
  package.json
```
