import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { logger } from './logger.js';

const SUPPORTED_EXTENSIONS = ['.ts', '.tqs', '.js'] as const;
const QUICKJS_DIRECTORIES = ['scripts', 'quickjs', 'tqs'] as const;
const TQS_MARKERS = ['// @tqs-script', '// @tqs'] as const;
const FIRST_LINES_TO_CHECK = 5;

const fileExists = (filePath: string): boolean =>
  fs.existsSync(filePath);

const getFileExtension = (filePath: string): string =>
  path.extname(filePath).toLowerCase();

const getDirectoryName = (filePath: string): string =>
  path.basename(path.dirname(filePath)).toLowerCase();

const readFileContent = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

const hasQuickJSExtension = (filePath: string): boolean =>
  getFileExtension(filePath) === '.tqs';

const hasQuickJSDirectory = (filePath: string): boolean => {
  const dirName = getDirectoryName(filePath);
  return (QUICKJS_DIRECTORIES as readonly string[]).includes(dirName);
};

const hasQuickJSComment = (filePath: string): boolean => {
  const content = readFileContent(filePath);
  if (!content) return false;

  const firstLines = content.split('\n').slice(0, FIRST_LINES_TO_CHECK).join('\n');
  return TQS_MARKERS.some(marker => firstLines.includes(marker));
};

const isQuickJSFile = (filePath: string): boolean =>
  hasQuickJSExtension(filePath) ||
  hasQuickJSDirectory(filePath) ||
  hasQuickJSComment(filePath);

const getQuickJSBinaryPath = (): string =>
  path.join(import.meta.dirname ?? __dirname, '..', 'bin', 'tqs');

const getGlobalTypesPath = (): string =>
  path.join(import.meta.dirname ?? __dirname, 'global.d.ts');

const createOutputPath = (inputPath: string): string => {
  const ext = getFileExtension(inputPath);
  return ext === '.tqs'
    ? inputPath.replace(/\.tqs$/, '.js')
    : inputPath.replace(/\.ts$/, '.js');
};

const createTempTypeRoots = (globalTypesPath: string): string => {
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), 'tqs-types-'));
  const quickjsDir = path.join(tempDir, 'quickjs');
  fs.mkdirSync(quickjsDir);
  fs.copyFileSync(globalTypesPath, path.join(quickjsDir, 'index.d.ts'));
  return tempDir;
};

const buildTypeScriptCommand = (inputFile: string, outputFile: string, typeRootsDir: string | null): string => {
  const outDir = path.dirname(path.resolve(outputFile));
  const baseCmd = `npx tsc --target es2020 --module commonjs --outDir ${outDir} --lib ES2020`;
  const typeRootsFlag = typeRootsDir ? ` --typeRoots ${typeRootsDir}` : '';

  return `${baseCmd}${typeRootsFlag} ${inputFile}`;
};

const executeCommand = (command: string): void => {
  execSync(command, { stdio: 'inherit' });
};

const toTempTsPath = (filePath: string): string =>
  filePath.replace(/\.tqs$/, '.ts');

const compileTypeScript = (inputFile: string, includeQuickJSTypes: boolean): string => {
  const ext = getFileExtension(inputFile);
  const isTqs = ext === '.tqs';
  const tempFile = isTqs ? toTempTsPath(inputFile) : null;
  const tempTypeRoots = includeQuickJSTypes ? createTempTypeRoots(getGlobalTypesPath()) : null;

  if (tempFile) fs.copyFileSync(inputFile, tempFile);

  const sourceFile = tempFile ?? inputFile;
  const outputFile = createOutputPath(inputFile);
  const command = buildTypeScriptCommand(sourceFile, outputFile, tempTypeRoots);

  logger.step(`Compiling TypeScript: ${inputFile} -> ${outputFile}`);

  try {
    executeCommand(command);
  } finally {
    if (tempFile) removeFile(tempFile);
    if (tempTypeRoots) fs.rmSync(tempTypeRoots, { recursive: true });
  }

  return outputFile;
};

const executeWithQuickJS = (jsFile: string): void => {
  const binaryPath = getQuickJSBinaryPath();
  const command = `${binaryPath} ${jsFile}`;

  logger.step(`Running with QuickJS+maybefetch: ${jsFile}`);
  executeCommand(command);
};

const removeFile = (filePath: string): void => {
  if (fileExists(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const validateFileExists = (filePath: string): void => {
  if (!fileExists(filePath)) {
    throw new Error(`File '${filePath}' not found`);
  }
};

const validateQuickJSFile = (filePath: string): void => {
  if (!isQuickJSFile(filePath)) {
    const message = [
      `File '${filePath}' is not marked for QuickJS execution.`,
      'Use one of:',
      '  1. .tqs file extension',
      '  2. // @tqs-script comment at top of file',
      '  3. Place in scripts/, quickjs/, or tqs/ directory',
    ].join('\n');
    throw new Error(message);
  }
};

const validateFileType = (filePath: string): void => {
  const ext = getFileExtension(filePath);
  const isSupported = (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);

  if (!isSupported) {
    throw new Error(`Unsupported file type '${ext}'. Use .ts, .tqs, or .js files.`);
  }
};

const processTypeScriptFile = (filePath: string): void => {
  const isQuickJS = isQuickJSFile(filePath);
  const outputFile = compileTypeScript(filePath, isQuickJS);

  try {
    executeWithQuickJS(outputFile);
  } finally {
    removeFile(outputFile);
  }
};

const processJavaScriptFile = (filePath: string): void => {
  executeWithQuickJS(filePath);
};

export const compileAndRun = (filePath: string): void => {
  validateFileExists(filePath);
  validateQuickJSFile(filePath);
  validateFileType(filePath);

  const ext = getFileExtension(filePath);

  const isTypeScript = ext === '.ts' || ext === '.tqs';
  if (isTypeScript) {
    processTypeScriptFile(filePath);
  } else if (ext === '.js') {
    processJavaScriptFile(filePath);
  }
};
