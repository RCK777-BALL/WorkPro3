/*
 * SPDX-License-Identifier: MIT
 */

import { Project, Node, ArrowFunction, FunctionExpression } from 'ts-morph';
import glob from 'glob';
import path from 'path';
import logger from '../utils/logger';

/**
 * Heuristics:
 *  - Wrap `return` around response/next calls when they are top-level statements.
 *  - Insert `void param;` for unused req/res/next.
 */

const ROOT = path.resolve(process.cwd());
const TS_CONFIG = path.join(ROOT, 'tsconfig.json');

// Target your backend controllers/routes; tweak the glob if needed
const FILE_GLOBS = [
  'backend/controllers/**/*.ts',
  'backend/routes/**/*.ts',
];

const project = new Project({
  tsConfigFilePath: TS_CONFIG,
  // If your tsconfig includes only src/, you can also add files programmatically:
  skipAddingFilesFromTsConfig: false,
});

// Add files matched by globs
for (const pattern of FILE_GLOBS) {
  const files = glob.sync(pattern, { cwd: ROOT, absolute: true, nodir: true });
  for (const f of files) {
    if (!project.getSourceFile(f)) project.addSourceFileAtPath(f);
  }
}

const isResponseReturny = (text: string) => {
  // Very simple text heuristic — good enough for most controllers
  return /\bres\.(json|send|end)\s*\(/.test(text) ||
         /\bres\.status\s*\(/.test(text) && /\.json\s*\(/.test(text) ||
         /\bnext\s*\(/.test(text);
};

function ensureReturnOnTopLevelCalls(fn: ArrowFunction | FunctionExpression) {
  const body = fn.getBody();
  if (!body || !Node.isBlock(body)) return;

  body.getStatements().forEach((stmt) => {
    // Skip if already a return
    if (Node.isReturnStatement(stmt)) return;

    // Only transform simple expression statements
    if (!Node.isExpressionStatement(stmt)) return;

    const expr = stmt.getExpression();
    if (!Node.isCallExpression(expr)) return;

    const stmtText = stmt.getText();
    if (isResponseReturny(stmtText)) {
      stmt.replaceWithText(`return ${stmtText};`);
    }
  });
}

function markUnusedParams(fn: ArrowFunction | FunctionExpression) {
  const body = fn.getBody();
  if (!body || !Node.isBlock(body)) return;

  fn.getParameters().forEach((param) => {
    const name = param.getName();

    // Only consider typical Express params (but you can widen if you like)
    if (!['req', 'res', 'next', '_req', '_res', '_next'].includes(name)) return;

    // Check references; if no references other than the definition, it's unused
    const refs = param.findReferences();
    const isUsed = refs.some((ref) =>
      ref.getReferences().some((r) => !r.isDefinition() && r.getNode().getStart() !== param.getStart())
    );
    if (!isUsed) {
      // Insert a harmless usage to appease TS noUnusedParameters without changing behavior
      body.insertStatements(0, `void ${name};`);
    }
  });
}

function processFile(filePath: string) {
  const sf = project.getSourceFile(filePath);
  if (!sf) return;

  sf.forEachDescendant((node) => {
    let fn: ArrowFunction | FunctionExpression | undefined;

    if (Node.isArrowFunction(node)) fn = node;
    else if (Node.isFunctionExpression(node)) fn = node;

    if (!fn) return;

    ensureReturnOnTopLevelCalls(fn);
    markUnusedParams(fn);
  });
}

for (const sf of project.getSourceFiles()) {
  processFile(sf.getFilePath());
}

project.save().then(() => {
  logger.info('✅ Codemod complete. Re-run TypeScript to verify.');
});
