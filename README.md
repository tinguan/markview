# MarkView

A lightweight, web-based local markdown reader. Run it on your machine and browse any directory of markdown files through a clean browser interface — no cloud, no account, no tracking.

## Features

- **Workspace management** — point it at any local directory; all `.md` files are auto-discovered recursively
- **Branch mode** — group related directories (e.g. language variants, draft vs published) under one workspace
- **File tree sidebar** — auto-generated from directory structure, collapsible
- **Full-text search** — server-side search across every file in the active workspace (`Cmd+K`)
- **Markdown rendering** — headings, tables, code blocks, blockquotes, task lists, relative links
- **Persistent state** — workspaces saved to `data/workspaces.json`; last-used workspace restored on reload

---

## Run Locally

**Requirements:** Node.js 18+

```bash
git clone <repo-url>
cd markview
npm install
npm start
```

Open [httOpen [httOpen [httOpen [httOpen [httOpen [httOpen [httOpen [httOp aOpen [httd:
Open [httOpen [httOpen [httOpen [httOpen [httOpen [httOpen [httOpen [httOp aOpen [httd:
ce restored on reload
ce
 \
  --name markview \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:aths l  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME:/docs:ro  -v $HOME`docker-compose.yml` mounts:
- `./data` → workspace persistence
- `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` → - `$/D- `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` → - `${DOCS_DIR:-~}` me markview-3003 \
  -p 3003:3000 \
  -v $(pwd)/data:/app/data \
  -v /Users/you/Downloads:/docs:ro \
  markview:latest
```

Then open [http://localhost:3003](http://localhost:3003).

---

## Usage

1. Click **+** in the sidebar to add a workspace
2. Browse to a directory (use `/docs/...` paths when running in Docker)
3. Choose a mode:
   - **Workspace** — independent document root
   - **Branch** — grouped under an existing workspace
4. Click **Add** — the sidebar populates with discovered files

---

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/workspaces` | GET | List all workspaces |
| `/api/workspaces` | POST | Create `{name, rootPath, mode?, parentId?}` |
| `/api/workspaces/:id` | PUT | Update workspace |
| `/api/workspaces/:id` | DELETE | Delete workspace and its branches |
| `/api/tree/:workspaceId` | GET | File tree for a workspace |
| `/api/file/:workspaceId/*` | GET | File content (path-traversal protected) |
| `/api/browse?dir=` | GET | Directory browser for the path picker |
| `/api/search/:workspaceId?q=` | GET | Full-text search ac| `/api/search/:workspaceId?q=# Project Structure

```
markview/
  server.js            # Express backend — filesystem access, workspace API
  public/
    index.html         # Single-file frontend (vanilla JS, no build step)
  data/
    workspaces.json    # Persisted workspace config
  Dockerfile
  docker-compose.yml
  package.json
```
