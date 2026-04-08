import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { EXIT_FAILURE } from './constants.js';
import { logger } from './logger.js';
import { isTqsScript } from './marker.js';

const stripExtension = (filePath: string): string =>
  filePath.replace(/\.(ts|tqs|js)$/, '');

const toJsPath = (filePath: string): string =>
  filePath.replace(/\.(ts|tqs)$/, '.js');

const exec = (args: string[]): number =>
  os.exec(args, { block: true });

const hasTqsMarker = (filePath: string): boolean => {
  const file = std.loadFile(filePath);
  return file ? isTqsScript(file) : false;
};

const buildJs = (inputFile: string): string => {
  const outFile = toJsPath(inputFile);
  const result = exec(['bun', 'build', '--target', 'browser', '--outfile', outFile, inputFile]);
  if (result !== 0) {
    std.err.puts(`build failed: ${inputFile}\n`);
    std.exit(EXIT_FAILURE);
  }
  return outFile;
};

const buildBinary = (jsFile: string, outputFile: string): void => {
  const result = exec(['qjsc', '-o', outputFile, jsFile]);
  if (result !== 0) {
    std.err.puts(`qjsc failed: ${jsFile}\n`);
    std.exit(EXIT_FAILURE);
  }
};

export const compile = (inputFile: string): void => {
  const outputFile = stripExtension(inputFile);
  const isTsOnly = inputFile.endsWith('.ts');
  const isTypeScript = /\.(ts|tqs)$/.test(inputFile);

  if (isTsOnly && !hasTqsMarker(inputFile)) {
    logger.error(`${inputFile} is missing // @tqs-script — add it to mark this file as a tqs script`);
    std.exit(EXIT_FAILURE);
  }

  logger.step(`Compiling: ${inputFile} -> ${outputFile}`);

  const jsFile = isTypeScript ? buildJs(inputFile) : inputFile;
  buildBinary(jsFile, outputFile);

  if (isTypeScript) os.unlink(jsFile);

  logger.success(`Built: ${outputFile}`);
};
