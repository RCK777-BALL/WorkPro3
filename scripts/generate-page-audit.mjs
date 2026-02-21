#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const frontendRoot = path.join(repoRoot, 'frontend');
const pagesDir = path.join(frontendRoot, 'src', 'pages');
const testsDir = path.join(frontendRoot, 'src', 'test');

async function readAllFiles(dir, predicate) {
  const result = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await readAllFiles(fullPath, predicate);
      result.push(...nested);
    } else if (!predicate || predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

function sanitizeName(filePath) {
  const base = path.basename(filePath).toLowerCase();
  return base
    .replace(/\.(test|spec|pw\.test|e2e\.test)\.[tj]sx?$/, '')
    .replace(/\.(tsx|ts|jsx|js)$/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function relative(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function countMatches(source, pattern) {
  const match = source.match(pattern);
  return match ? match.length : 0;
}

async function main() {
  const pageFiles = await readAllFiles(pagesDir, (p) => p.endsWith('.tsx'));
  const testFiles = await readAllFiles(testsDir, (p) => /\.test\.[tj]sx?$/.test(p));

  const sanitizedTests = testFiles.map((file) => ({
    file,
    key: sanitizeName(file),
  }));

  const rows = [];
  const pagesMissingTests = [];

  for (const pageFile of pageFiles.sort()) {
    const content = await fs.readFile(pageFile, 'utf8');
    const sanitizedPage = sanitizeName(pageFile);
    const candidateTests = sanitizedTests
      .filter((test) => {
        if (!test.key) return false;
        const shorterLength = Math.min(sanitizedPage.length, test.key.length);
        if (shorterLength < 5) {
          return sanitizedPage === test.key;
        }
        return (
          test.key.includes(sanitizedPage) || sanitizedPage.includes(test.key)
        );
      })
      .map((test) => relative(test.file));

    if (candidateTests.length === 0) {
      pagesMissingTests.push(relative(pageFile));
    }

    const lines = content.split(/\r?\n/).length;
    const apiCalls = countMatches(content, /http\./g);
    const formHooks = countMatches(content, /useForm\(/g);
    const dialogUsage = countMatches(content, /Dialog/g);
    const chartUsage = countMatches(content, /Chart/g);
    const tableUsage = countMatches(content, /Table/g);
    const todoCount = countMatches(content, /TODO|FIXME/g);

    rows.push({
      page: relative(pageFile),
      lines,
      apiCalls,
      formHooks,
      dialogUsage,
      chartUsage,
      tableUsage,
      todoCount,
      tests: candidateTests,
    });
  }

  const header = `# frontend Page Audit\n\n` +
    `Generated on ${new Date().toISOString()} using scripts/generate-page-audit.mjs.\n\n` +
    `This report lists every component in \`src/pages\` and shows the heuristically matched tests under \`src/test\`.\n` +
    `Counts for API calls, forms, tables, dialogs, and charts are based on simple string searches to highlight complexity hotspots.`;

  const tableHeader = `\n\n| Page | Lines | API Calls | useForm | Tables | Dialogs | Charts | TODO/FIXME | Candidate Tests |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |`;

  const tableRows = rows
    .map((row) => {
      const testsCell = row.tests.length
        ? row.tests.map((t) => `[${path.basename(t)}](${t})`).join('<br>')
        : '—';
      return `| [${path.basename(row.page)}](${row.page}) | ${row.lines} | ${row.apiCalls} | ${row.formHooks} | ${row.tableUsage} | ${row.dialogUsage} | ${row.chartUsage} | ${row.todoCount} | ${testsCell} |`;
    })
    .join('\n');

  const missingSection = pagesMissingTests.length
    ? `\n\n## Pages Without Direct Test Matches\n\n${pagesMissingTests
        .map((page) => `- ${page}`)
        .join('\n')}\n`
    : `\n\n## Pages Without Direct Test Matches\n\nAll pages have at least one matching test file based on filename heuristics.\n`;

  const suggestions = `\n## Notes\n\n- The heuristic considers only file names. Some components may still be covered indirectly by integration or end-to-end tests.\n- Consider adding explicit tests for pages listed above to ensure critical user flows remain protected.`;

  const markdown = header + tableHeader + '\n' + tableRows + missingSection + suggestions + '\n';

  await fs.writeFile(path.join(repoRoot, 'docs', 'frontend-page-audit.md'), markdown, 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
