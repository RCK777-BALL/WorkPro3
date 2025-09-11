import { promises as fs } from 'fs';
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const repoRoot = path.resolve(__dirname, '..');
const headerPath = path.join(__dirname, 'license-header.txt');
const header = await fs.readFile(headerPath, 'utf8') + '\n';

const exts = new Set(['.ts', '.tsx']);
const ignoreDirs = new Set(['node_modules', 'dist', 'build', 'coverage']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        await walk(fullPath);
      }
    } else {
      const ext = path.extname(entry.name);
      if (exts.has(ext) && !entry.name.endsWith('.d.ts')) {
        const content = await fs.readFile(fullPath, 'utf8');
        if (!content.startsWith(header.trim())) {
          await fs.writeFile(fullPath, header + content);
        }
      }
    }
  }
}

await walk(path.join(repoRoot, 'backend'));
await walk(path.join(repoRoot, 'frontend'));
