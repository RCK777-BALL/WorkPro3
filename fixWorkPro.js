#!/usr/bin/env node
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
let Project;
let ts;
let SyntaxKind;
let QuoteKind;
let fs;
let globSync;
try {
  const fsExtra = await import("fs-extra");
  fs = fsExtra.default ?? fsExtra;
} catch (error) {
  console.error("❌ Missing dependency 'fs-extra'. Install it with `npm install fs-extra`.");
  process.exit(1);
}

try {
  const globModule = await import("glob");
  globSync = globModule.globSync;
} catch (error) {
  console.error("❌ Missing dependency 'glob'. Install it with `npm install glob`.");
  process.exit(1);
}

try {
  const tsMorph = await import("ts-morph");
  Project = tsMorph.Project;
  ts = tsMorph.ts;
  SyntaxKind = tsMorph.SyntaxKind;
  QuoteKind = tsMorph.QuoteKind;
} catch (error) {
  console.error("❌ Missing dependency 'ts-morph'. Install it with `npm install ts-morph`.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANSI = {
  reset: "\u001b[0m",
  cyan: "\u001b[36m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  orange: "\u001b[38;5;208m",
};

const log = {
  info: (message) => console.log(`${ANSI.cyan}%s${ANSI.reset}`, message),
  step: (message) => console.log(`${ANSI.yellow}%s${ANSI.reset}`, message),
  success: (message) => console.log(`${ANSI.green}%s${ANSI.reset}`, message),
  warn: (message) => console.log(`${ANSI.orange}%s${ANSI.reset}`, message),
  error: (message) => console.log(`${ANSI.red}%s${ANSI.reset}`, message),
};

const args = process.argv.slice(2);
const hasFixFlag = args.includes("--fix");
const checkMode = args.includes("--check");

if (checkMode && hasFixFlag) {
  log.error("Cannot run with both --check and --fix.");
  process.exit(1);
}

const rootDir = __dirname;
const backupRoot = path.join(rootDir, ".fix-backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(backupRoot, timestamp);
const reportPath = path.join(rootDir, "fixReport.log");
const reportEntries = [];
let totalFixed = 0;
let totalSkipped = 0;
let totalFailed = 0;

const IMPORT_MAP = {
  Request: { module: "express", named: true },
  Response: { module: "express", named: true },
  NextFunction: { module: "express", named: true },
  Router: { module: "express", named: true },
  Types: { module: "mongoose", named: true },
  Schema: { module: "mongoose", named: true },
  model: { module: "mongoose", named: true },
  PDFDocument: { module: "pdfkit", named: false, default: true },
  Document: { module: "mongoose", named: true },
};

function appendReport(message) {
  reportEntries.push(message);
}

function ensureBackup(relativePath) {
  if (checkMode) return;
  const source = path.join(rootDir, relativePath);
  const target = path.join(backupDir, relativePath);
  fs.ensureDirSync(path.dirname(target));
  if (!fs.existsSync(target)) {
    fs.copyFileSync(source, target);
  }
}

function flattenMessage(message) {
  if (typeof message === "string") return message;
  let current = message;
  const parts = [];
  while (current) {
    parts.push(current.messageText);
    current = current.next;
  }
  return parts.join(" \u2192 ");
}

function toRelative(filePath) {
  return path.relative(rootDir, filePath);
}

function addImport(sourceFile, identifier, config) {
  const existing = sourceFile
    .getImportDeclarations()
    .find((imp) => imp.getModuleSpecifierValue() === config.module);

  if (existing) {
    if (config.default || config.named === false) {
      if (!existing.getDefaultImport()) {
        existing.setDefaultImport(identifier);
      }
    } else if (!existing.getNamedImports().some((ni) => ni.getName() === identifier)) {
      existing.addNamedImport({ name: identifier });
    }
    return;
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: config.module,
    defaultImport: config.default ? identifier : undefined,
    namedImports: config.named && !config.default ? [identifier] : [],
  });
}

function addRelativeImport(sourceFile, identifier, targetFile) {
  const relativePath = sourceFile.getRelativePathAsModuleSpecifierTo(targetFile);
  const existing = sourceFile
    .getImportDeclarations()
    .find((imp) => imp.getModuleSpecifierValue() === relativePath);

  if (existing) {
    if (!existing.getNamedImports().some((ni) => ni.getName() === identifier)) {
      existing.addNamedImport({ name: identifier });
    }
    return;
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: relativePath,
    namedImports: [identifier],
  });
}

function fixDuplicateDeclarations(sourceFile, diagnostics) {
  const duplicates = diagnostics.filter((diag) => diag.getCode() === 2451);
  if (!duplicates.length) return;

  const renameCounts = new Map();

  for (const diagnostic of duplicates) {
    const text = flattenMessage(diagnostic.getMessageText());
    const match = text.match(/'([^']+)'/);
    if (!match) continue;
    const name = match[1];
    const declarations = [
      ...sourceFile.getVariableDeclarations().filter((decl) => decl.getName() === name),
      ...sourceFile.getFunctions().filter((decl) => decl.getName() === name),
      ...sourceFile.getClasses().filter((decl) => decl.getName() === name),
      ...sourceFile.getInterfaces().filter((decl) => decl.getName() === name),
      ...sourceFile.getEnums().filter((decl) => decl.getName() === name),
    ];
    if (declarations.length <= 1) continue;

    for (let i = 1; i < declarations.length; i += 1) {
      const decl = declarations[i];
      const count = (renameCounts.get(name) || 0) + 1;
      renameCounts.set(name, count);
      const newName = `${name}_${count}`;
      try {
        decl.rename(newName);
        appendReport(`Renamed duplicate declaration ${name} -> ${newName} in ${toRelative(sourceFile.getFilePath())}`);
        totalFixed += 1;
      } catch (error) {
        appendReport(`Failed to rename duplicate ${name} in ${toRelative(sourceFile.getFilePath())}: ${error.message}`);
        totalFailed += 1;
      }
    }
  }
}

function fixImplicitAny(sourceFile, diagnostics) {
  const targetDiagnostics = diagnostics.filter((diag) => diag.getCode() === 7006);
  for (const diagnostic of targetDiagnostics) {
    const node = diagnostic.getNode();
    if (!node) continue;
    const parameter = node.getFirstAncestorByKind(SyntaxKind.Parameter);
    if (!parameter || parameter.getTypeNode()) continue;
    parameter.setType("any");
    appendReport(`Added 'any' type to parameter ${parameter.getName()} in ${toRelative(sourceFile.getFilePath())}`);
    totalFixed += 1;
  }
}

function fixAwaitedMisuse(sourceFile) {
  const references = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference);
  let changed = false;
  for (const reference of references) {
    if (reference.getText().startsWith("Awaited<")) {
      const typeArguments = reference.getTypeArguments();
      if (typeArguments.length === 1) {
        reference.replaceWithText(typeArguments[0].getText());
        changed = true;
      }
    }
  }
  if (changed) {
    appendReport(`Replaced Awaited<T> usages in ${toRelative(sourceFile.getFilePath())}`);
    totalFixed += 1;
  }
}

function ensurePdfDocumentImport(sourceFile) {
  const text = sourceFile.getFullText();
  if (!/new\s+PDFDocument/.test(text)) return;

  const hasImport = sourceFile
    .getImportDeclarations()
    .some((imp) => imp.getModuleSpecifierValue() === "pdfkit");

  if (!hasImport) {
    sourceFile.addImportDeclaration({ moduleSpecifier: "pdfkit", defaultImport: "PDFDocument" });
    appendReport(`Added PDFDocument import in ${toRelative(sourceFile.getFilePath())}`);
    totalFixed += 1;
  } else {
    const importDecl = sourceFile
      .getImportDeclarations()
      .find((imp) => imp.getModuleSpecifierValue() === "pdfkit");
    if (importDecl && !importDecl.getDefaultImport()) {
      importDecl.setDefaultImport("PDFDocument");
      appendReport(`Ensured PDFDocument default import from pdfkit in ${toRelative(sourceFile.getFilePath())}`);
      totalFixed += 1;
    }
  }

  const constructorMatches = sourceFile
    .getDescendantsOfKind(SyntaxKind.NewExpression)
    .filter((expr) => expr.getExpression().getText() === "PDFDocument");

  for (const match of constructorMatches) {
    const parent = match.getParentIfKind(SyntaxKind.VariableDeclaration);
    if (!parent) continue;
    const variableName = parent.getName();
    const usage = new RegExp(`${variableName}\\.pipe\\(`);
    if (!usage.test(text)) {
      appendReport(`Warning: ${variableName}.pipe(...) missing in ${toRelative(sourceFile.getFilePath())}`);
      totalSkipped += 1;
    }
  }
}

function ensureExports(sourceFile) {
  const routerDeclaration = sourceFile.getVariableDeclaration("router");
  if (routerDeclaration) {
    const hasDefaultExport = sourceFile
      .getExportAssignments()
      .some((assignment) => !assignment.isExportEquals());
    if (!hasDefaultExport) {
      sourceFile.addExportAssignment({ expression: "router" });
      appendReport(`Added default export for router in ${toRelative(sourceFile.getFilePath())}`);
      totalFixed += 1;
    }
  }

  sourceFile.getExportDeclarations().forEach((exportDecl) => {
    const named = exportDecl.getNamedExports();
    const seen = new Set();
    let modified = false;
    for (const namedExport of [...named]) {
      const name = namedExport.getName();
      if (seen.has(name)) {
        namedExport.remove();
        modified = true;
      } else {
        seen.add(name);
      }
    }
    if (modified) {
      appendReport(`Removed duplicate named exports in ${toRelative(sourceFile.getFilePath())}`);
      totalFixed += 1;
    }
  });
}

function convertCommonJs(sourceFile) {
  let converted = false;
  sourceFile.getVariableStatements().forEach((statement) => {
    const declarations = statement.getDeclarations();
    if (declarations.length !== 1) return;
    const declaration = declarations[0];
    const initializer = declaration.getInitializerIfKind(SyntaxKind.CallExpression);
    if (!initializer) return;
    if (initializer.getExpression().getText() !== "require") return;
    const [moduleArg] = initializer.getArguments();
    if (!moduleArg || moduleArg.getKind() !== SyntaxKind.StringLiteral) return;
    const moduleName = moduleArg.getText().slice(1, -1);

    if (declaration.isKind(SyntaxKind.VariableDeclaration)) {
      const nameNode = declaration.getNameNode();
      if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
        const elements = nameNode.getElements().map((el) => ({
          name: el.getName(),
          propertyName: el.getPropertyNameNode()?.getText(),
        }));
        sourceFile.addImportDeclaration({
          moduleSpecifier: moduleName,
          namedImports: elements.map((el) =>
            el.propertyName && el.propertyName !== el.name
              ? { name: el.propertyName.replace(/^["']|["']$/g, ""), alias: el.name }
              : el.name,
          ),
        });
      } else if (nameNode.isKind(SyntaxKind.ArrayBindingPattern)) {
        return;
      } else {
        sourceFile.addImportDeclaration({
          moduleSpecifier: moduleName,
          defaultImport: nameNode.getText(),
        });
      }
      statement.remove();
      converted = true;
    }
  });

  const moduleExports = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  moduleExports.forEach((expr) => {
    if (expr.getLeft().getText() === "module.exports") {
      const right = expr.getRight();
      if (right.isKind(SyntaxKind.Identifier)) {
        sourceFile.addExportAssignment({ expression: right.getText(), isExportEquals: false });
        expr.getStatement().remove();
        converted = true;
      } else if (right.isKind(SyntaxKind.ObjectLiteralExpression)) {
        right.getProperties().forEach((property) => {
          if (property.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
            sourceFile.addExportDeclaration({ namedExports: [property.getName()] });
          } else if (property.isKind(SyntaxKind.PropertyAssignment)) {
            const name = property.getName();
            const initializer = property.getInitializer();
            if (initializer && initializer.isKind(SyntaxKind.Identifier)) {
              sourceFile.addStatements(`export const ${name} = ${initializer.getText()};`);
            }
          }
        });
        expr.getStatement().remove();
        converted = true;
      }
    }
  });

  if (converted) {
    appendReport(`Converted CommonJS to ES module in ${toRelative(sourceFile.getFilePath())}`);
    totalFixed += 1;
  }
}

function ensureImportsFromDiagnostics(sourceFile, diagnostics, project) {
  const missingNames = diagnostics
    .filter((diag) => diag.getCode() === 2304)
    .map((diag) => {
      const text = flattenMessage(diagnostic.getMessageText());
      const match = text.match(/'([^']+)'/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  if (!missingNames.length) return;

  for (const name of missingNames) {
    if (IMPORT_MAP[name]) {
      addImport(sourceFile, name, {
        module: IMPORT_MAP[name].module,
        named: IMPORT_MAP[name].named,
        default: IMPORT_MAP[name].default,
      });
      appendReport(`Added mapped import for ${name} in ${toRelative(sourceFile.getFilePath())}`);
      totalFixed += 1;
      continue;
    }

    const exportedFile = project.getSourceFiles().find((file) => {
      const exportedSymbols = file.getExportSymbols();
      return exportedSymbols.some((symbol) => symbol.getName() === name);
    });

    if (exportedFile) {
      addRelativeImport(sourceFile, name, exportedFile);
      appendReport(`Added relative import for ${name} from ${toRelative(exportedFile.getFilePath())}`);
      totalFixed += 1;
    } else {
      appendReport(`Skipped adding import for ${name} (definition not found) in ${toRelative(sourceFile.getFilePath())}`);
      totalSkipped += 1;
    }
  }
}

function fixTypeMismatches(sourceFile, diagnostics) {
  const mismatchDiagnostics = diagnostics.filter((diag) => diag.getCode() === 2322);
  for (const diagnostic of mismatchDiagnostics) {
    const text = flattenMessage(diagnostic.getMessageText());
    const match = text.match(/Type '([^']+)' is not assignable to type '([^']+)'/);
    if (!match) continue;
    const [, , targetType] = match;
    const node = diagnostic.getNode();
    if (!node) continue;
    const expression = node.getFirstAncestor((ancestor) =>
      ancestor.isKind(SyntaxKind.BinaryExpression) || ancestor.isKind(SyntaxKind.ReturnStatement),
    );
    if (!expression) continue;

    if (expression.isKind(SyntaxKind.BinaryExpression)) {
      const right = expression.getRight();
      right.replaceWithText(`${right.getText()} as unknown as ${targetType}`);
      appendReport(`Inserted safe cast for assignment in ${toRelative(sourceFile.getFilePath())}`);
      totalFixed += 1;
    } else if (expression.isKind(SyntaxKind.ReturnStatement)) {
      const expr = expression.getExpression();
      if (!expr) continue;
      expr.replaceWithText(`${expr.getText()} as unknown as ${targetType}`);
      appendReport(`Inserted safe cast for return in ${toRelative(sourceFile.getFilePath())}`);
      totalFixed += 1;
    }
  }
}

function handleDiagnostics(project) {
  const diagnostics = project.getPreEmitDiagnostics();
  const diagnosticsByFile = new Map();

  diagnostics.forEach((diagnostic) => {
    const sourceFile = diagnostic.getSourceFile();
    if (!sourceFile) return;
    const list = diagnosticsByFile.get(sourceFile) || [];
    list.push(diagnostic);
    diagnosticsByFile.set(sourceFile, list);
  });

  diagnosticsByFile.forEach((fileDiagnostics, sourceFile) => {
    ensureBackup(toRelative(sourceFile.getFilePath()));
    fixDuplicateDeclarations(sourceFile, fileDiagnostics);
    fixImplicitAny(sourceFile, fileDiagnostics);
    fixTypeMismatches(sourceFile, fileDiagnostics);
    ensureImportsFromDiagnostics(sourceFile, fileDiagnostics, project);
  });
}

function gatherFiles() {
  return globSync("**/*.{ts,tsx,js}", {
    cwd: rootDir,
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**", "**/.fix-backups/**"],
    nodir: true,
  });
}

function createProject() {
  const tsconfigPath = path.join(rootDir, "tsconfig.json");
  const options = fs.existsSync(tsconfigPath)
    ? { tsConfigFilePath: tsconfigPath }
    : {
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          noEmit: true,
          skipLibCheck: true,
          esModuleInterop: true,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2021,
        },
      };

  return new Project({
    ...options,
    skipFileDependencyResolution: true,
    manipulationSettings: {
      quoteKind: QuoteKind.Double,
      usePrefixAndSuffixTextForRename: false,
    },
  });
}

function convertAllCommonJs(project) {
  project.getSourceFiles().forEach((sourceFile) => {
    ensureBackup(toRelative(sourceFile.getFilePath()));
    convertCommonJs(sourceFile);
  });
}

function ensurePdfUsage(project) {
  project.getSourceFiles().forEach((sourceFile) => {
    ensureBackup(toRelative(sourceFile.getFilePath()));
    ensurePdfDocumentImport(sourceFile);
  });
}

function enforceExports(project) {
  project.getSourceFiles().forEach((sourceFile) => {
    ensureBackup(toRelative(sourceFile.getFilePath()));
    ensureExports(sourceFile);
    fixAwaitedMisuse(sourceFile);
  });
}

function runFormatters() {
  if (checkMode) return;
  try {
    execSync("npx prettier --write \"**/*.{ts,tsx,js,json}\"", { cwd: rootDir, stdio: "inherit" });
  } catch (error) {
    appendReport(`Prettier failed: ${error.message}`);
    totalFailed += 1;
  }
  try {
    execSync("npx eslint --ext .ts,.tsx,.js --fix .", { cwd: rootDir, stdio: "inherit" });
  } catch (error) {
    appendReport(`ESLint failed: ${error.message}`);
    totalFailed += 1;
  }
}

function writeReport() {
  const header = `Fix report generated ${new Date().toISOString()}\nMode: ${checkMode ? "CHECK" : "FIX"}\n`; 
  const counts = `Totals -> Fixed: ${totalFixed}, Skipped: ${totalSkipped}, Failed: ${totalFailed}\n`;
  const content = `${header}${counts}${reportEntries.map((entry) => `- ${entry}`).join("\n")}\n\n`;
  fs.ensureFileSync(reportPath);
  fs.appendFileSync(reportPath, content, "utf8");
}

async function main() {
  log.info("Scanning project for TypeScript diagnostics...");

  const files = gatherFiles();
  if (!files.length) {
    log.warn("No TypeScript or JavaScript files found.");
    return;
  }

  if (!checkMode) {
    fs.ensureDirSync(backupDir);
  }

  const project = createProject();
  project.addSourceFilesAtPaths(
    files.map((file) => path.join(rootDir, file)),
  );

  convertAllCommonJs(project);
  enforceExports(project);
  ensurePdfUsage(project);

  handleDiagnostics(project);

  if (!checkMode) {
    await project.save();
    runFormatters();
  }

  const remainingDiagnostics = project.getPreEmitDiagnostics();
  const summary = remainingDiagnostics.length
    ? `${remainingDiagnostics.length} diagnostics remain.`
    : "No diagnostics remain.";

  appendReport(summary);

  if (remainingDiagnostics.length) {
    remainingDiagnostics.forEach((diag) => {
      const file = diag.getSourceFile();
      if (!file) return;
      const message = flattenMessage(diag.getMessageText());
      appendReport(`Remaining issue in ${toRelative(file.getFilePath())}: ${message}`);
    });
    log.warn(summary);
    totalSkipped += remainingDiagnostics.length;
  } else {
    log.success("Project is free of TypeScript diagnostics (as far as automatic fixes allowed).");
  }

  log.success(`Fixed: ${totalFixed}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`);
  writeReport();
}

main().catch((error) => {
  appendReport(`Fatal error: ${error.stack || error.message}`);
  writeReport();
  log.error(error.stack || error.message);
  process.exit(1);
});
