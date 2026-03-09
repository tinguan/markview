// ═══════════════════════════════════════════════════════════════
// MarkView — Local Markdown Documentation Viewer
// ═══════════════════════════════════════════════════════════════
// Backend server: filesystem access, workspace persistence, API
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'workspaces.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helpers ──────────────────────────────────────────────────

function readWorkspaces() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeWorkspaces(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function genId() {
  return crypto.randomBytes(8).toString('hex');
}

/** Recursively scan a directory for markdown files, returning a tree. */
function scanDir(rootPath, relativeTo) {
  const base = relativeTo || rootPath;
  const result = [];
  let entries;
  try {
    entries = fs.readdirSync(rootPath, { withFileTypes: true });
  } catch {
    return result;
  }

  // Sort: directories first, then files, alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    // Skip hidden dirs/files, node_modules, .git
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(rootPath, entry.name);
    const relPath = path.relative(base, fullPath);

    if (entry.isDirectory()) {
      const children = scanDir(fullPath, base);
      // Only include directories that contain markdown files (directly or nested)
      if (children.length > 0) {
        result.push({
          type: 'dir',
          name: entry.name,
          path: relPath,
          children,
        });
      }
    } else if (/\.(md|markdown|mdown|mkd|mdx)$/i.test(entry.name)) {
      result.push({
        type: 'file',
        name: entry.name,
        path: relPath,
      });
    }
  }
  return result;
}

/** Flatten tree to list of file paths */
function flattenTree(tree) {
  const files = [];
  for (const node of tree) {
    if (node.type === 'file') files.push(node.path);
    else if (node.children) files.push(...flattenTree(node.children));
  }
  return files;
}

/** Resolve ~ in paths */
function expandPath(p) {
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
  return path.resolve(p);
}

/** Security: ensure requested path is within the allowed root */
function isPathInside(child, parent) {
  const resolved = path.resolve(child);
  const resolvedParent = path.resolve(parent);
  return resolved.startsWith(resolvedParent + path.sep) || resolved === resolvedParent;
}

// ── API: Workspaces ──────────────────────────────────────────

// List all workspaces
app.get('/api/workspaces', (_req, res) => {
  res.json(readWorkspaces());
});

// Create workspace
app.post('/api/workspaces', (req, res) => {
  const { name, rootPath, mode, parentId } = req.body;
  if (!name || !rootPath) {
    return res.status(400).json({ error: 'name and rootPath are required' });
  }

  const resolved = expandPath(rootPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return res.status(400).json({ error: `Path does not exist or is not a directory: ${resolved}` });
  }

  const workspaces = readWorkspaces();

  // If mode is 'branch', validate parentId
  if (mode === 'branch') {
    if (!parentId) {
      return res.status(400).json({ error: 'parentId is required for branch mode' });
    }
    const parent = workspaces.find(w => w.id === parentId);
    if (!parent) {
      return res.status(400).json({ error: 'Parent workspace not found' });
    }
  }

  const ws = {
    id: genId(),
    name,
    rootPath: resolved,
    mode: mode || 'workspace',
    parentId: mode === 'branch' ? parentId : null,
    createdAt: new Date().toISOString(),
  };

  workspaces.push(ws);
  writeWorkspaces(workspaces);
  res.status(201).json(ws);
});

// Update workspace
app.put('/api/workspaces/:id', (req, res) => {
  const workspaces = readWorkspaces();
  const idx = workspaces.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, rootPath, mode, parentId } = req.body;
  if (name) workspaces[idx].name = name;
  if (rootPath) {
    const resolved = expandPath(rootPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return res.status(400).json({ error: `Invalid path: ${resolved}` });
    }
    workspaces[idx].rootPath = resolved;
  }
  if (mode) workspaces[idx].mode = mode;
  if (mode === 'branch' && parentId) workspaces[idx].parentId = parentId;

  writeWorkspaces(workspaces);
  res.json(workspaces[idx]);
});

// Delete workspace (and its branches)
app.delete('/api/workspaces/:id', (req, res) => {
  let workspaces = readWorkspaces();
  const target = workspaces.find(w => w.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });

  // Remove the workspace and any branches pointing to it
  workspaces = workspaces.filter(w => w.id !== req.params.id && w.parentId !== req.params.id);
  writeWorkspaces(workspaces);
  res.json({ ok: true });
});

// ── API: File Tree ───────────────────────────────────────────

// Get file tree for a workspace
app.get('/api/tree/:workspaceId', (req, res) => {
  const workspaces = readWorkspaces();
  const ws = workspaces.find(w => w.id === req.params.workspaceId);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  if (!fs.existsSync(ws.rootPath)) {
    return res.status(400).json({ error: 'Root path no longer exists' });
  }

  const tree = scanDir(ws.rootPath);
  const files = flattenTree(tree);
  res.json({ tree, totalFiles: files.length, rootPath: ws.rootPath });
});

// ── API: File Content ────────────────────────────────────────

// Read file content (scoped to a workspace root)
app.get('/api/file/:workspaceId/*', (req, res) => {
  const workspaces = readWorkspaces();
  const ws = workspaces.find(w => w.id === req.params.workspaceId);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  const relPath = req.params[0];
  const fullPath = path.join(ws.rootPath, relPath);

  // Security: prevent path traversal
  if (!isPathInside(fullPath, ws.rootPath)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return res.status(404).json({ error: 'File not found' });
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  res.type('text/plain').send(content);
});

// ── API: Directory Browser ───────────────────────────────────

// Browse directories for the path picker
app.get('/api/browse', (req, res) => {
  let dir = req.query.dir || os.homedir();
  dir = expandPath(dir);

  if (!fs.existsSync(dir)) {
    return res.status(400).json({ error: 'Directory does not exist' });
  }

  try {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Count markdown files at this level (preview)
    const mdCount = entries.filter(e => e.isFile() && /\.(md|markdown|mdown|mkd|mdx)$/i.test(e.name)).length;

    res.json({
      current: dir,
      parent: path.dirname(dir) !== dir ? path.dirname(dir) : null,
      dirs,
      mdCount,
    });
  } catch (e) {
    res.status(403).json({ error: 'Cannot read directory: ' + e.message });
  }
});

// ── API: Search across workspace ─────────────────────────────

app.get('/api/search/:workspaceId', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);

  const workspaces = readWorkspaces();
  const ws = workspaces.find(w => w.id === req.params.workspaceId);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });

  const tree = scanDir(ws.rootPath);
  const files = flattenTree(tree);
  const results = [];

  for (const relPath of files) {
    const fullPath = path.join(ws.rootPath, relPath);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const nameLower = path.basename(relPath).toLowerCase();
      const contentLower = content.toLowerCase();

      if (nameLower.includes(q) || contentLower.includes(q)) {
        let snippet = '';
        const idx = contentLower.indexOf(q);
        if (idx >= 0) {
          snippet = content.substring(Math.max(0, idx - 50), idx + q.length + 80).replace(/\n/g, ' ').trim();
        }
        // Extract first heading as title
        const titleMatch = content.match(/^#\s+(.+)$/m);
        results.push({
          path: relPath,
          title: titleMatch ? titleMatch[1] : path.basename(relPath, path.extname(relPath)),
          snippet,
          matchInName: nameLower.includes(q),
        });
      }
    } catch { /* skip unreadable files */ }

    if (results.length >= 50) break; // cap results
  }

  // Sort: name matches first
  results.sort((a, b) => (b.matchInName ? 1 : 0) - (a.matchInName ? 1 : 0));
  res.json(results);
});

// ── Fallback: SPA ────────────────────────────────────────────

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`MarkView running at http://localhost:${PORT}`);
});
