import { logger } from './logger.js';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// File validation functions
const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

const getFileExtension = (filePath: string): string => {
  return path.extname(filePath).toLowerCase();
};

const getDirectoryName = (filePath: string): string => {
  return path.basename(path.dirname(filePath)).toLowerCase();
};

const readFileContent = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

// QuickJS detection functions
const hasQuickJSExtension = (filePath: string): boolean => {
  return getFileExtension(filePath) === '.tqs';
};

const hasQuickJSDirectory = (filePath: string): boolean => {
  const dirName = getDirectoryName(filePath);
  return ['scripts', 'quickjs', 'tqs'].includes(dirName);
};

const hasQuickJSComment = (filePath: string): boolean => {
  const content = readFileContent(filePath);
  if (!content) {
    return false;
  }

  const firstLines = content.split('\n').slice(0, 5).join('\n');
  return firstLines.includes('// @tqs-script') || firstLines.includes('// @tqs');
};

const isQuickJSFile = (filePath: string): boolean => {
  return hasQuickJSExtension(filePath) ||
         hasQuickJSDirectory(filePath) ||
         hasQuickJSComment(filePath);
};

// Path resolution functions
const getQuickJSBinaryPath = (): string => {
  return path.join(__dirname, '..', 'bin', 'tqs');
};

const getGlobalTypesPath = (): string => {
  return path.join(__dirname, 'global.d.ts');
};

const createOutputPath = (inputPath: string): string => {
  const ext = getFileExtension(inputPath);
  return ext === '.tqs'
    ? inputPath.replace(/\.tqs$/, '.js')
    : inputPath.replace(/\.ts$/, '.js');
};

// Compilation functions
const buildTypeScriptCommand = (inputFile: string, outputFile: string, includeQuickJSTypes: boolean): string => {
  const baseCmd = 'npx tsc --target es2020 --module commonjs --outDir . --lib ES2020';

  if (includeQuickJSTypes) {
    const typesDir = path.dirname(getGlobalTypesPath());
    return `${baseCmd} --typeRoots ${typesDir} ${inputFile}`;
  }

  return `${baseCmd} ${inputFile}`;
};

const executeCommand = (command: string): void => {
  execSync(command, { stdio: 'inherit' });
};

const compileTypeScript = (inputFile: string, includeQuickJSTypes: boolean): string => {
  const outputFile = createOutputPath(inputFile);
  const command = buildTypeScriptCommand(inputFile, outputFile, includeQuickJSTypes);

  logger.info(`Compiling TypeScript: ${inputFile} → ${outputFile}`);
  executeCommand(command);

  return outputFile;
};

// Execution functions
const executeWithQuickJS = (jsFile: string): void => {
  const binaryPath = getQuickJSBinaryPath();
  const command = `${binaryPath} ${jsFile}`;

  logger.info(`Running with QuickJS+maybefetch: ${jsFile}`);
  executeCommand(command);
};

// Cleanup functions
const removeFile = (filePath: string): void => {
  if (fileExists(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Validation functions
const validateFileExists = (filePath: string): boolean => {
  if (!fileExists(filePath)) {
    logger.error(`Error: File '${filePath}' not found`);
    return false;
  }
  return true;
};

const validateQuickJSFile = (filePath: string): boolean => {
  if (!isQuickJSFile(filePath)) {
    logger.error(`Error: File '${filePath}' is not marked for QuickJS execution.`);
    logger.error('Use one of:');
    logger.error('  1. .tqs file extension');
    logger.error('  2. // @tqs-script comment at top of file');
    logger.error('  3. Place in scripts/, quickjs/, or tqs/ directory');
    return false;
  }
  return true;
};

const validateFileType = (filePath: string): boolean => {
  const ext = getFileExtension(filePath);
  const supportedExts = ['.ts', '.tqs', '.js'];

  if (!supportedExts.includes(ext)) {
    logger.error(`Error: Unsupported file type '${ext}'. Use .ts, .tqs, or .js files.`);
    return false;
  }
  return true;
};

// Main compilation functions
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

// Main export
export const compileAndRun = (filePath: string): void => {
  if (!validateFileExists(filePath) ||
      !validateQuickJSFile(filePath) ||
      !validateFileType(filePath)) {
    process.exit(1);
  }

  const ext = getFileExtension(filePath);

  try {
    if (ext === '.ts' || ext === '.tqs') {
      processTypeScriptFile(filePath);
    } else if (ext === '.js') {
      processJavaScriptFile(filePath);
    }
  } catch (error) {
    logger.error(`Compilation or execution failed: ${error.message}`);
    process.exit(1);
  }
};