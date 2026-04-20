import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXIT_SUCCESS, EXIT_FAILURE } from '../constants.js';
import { parseArgs } from './args.js';
import { showHelp } from './help.js';
import { showVersion } from './version.js';
import { buildExecutable, compileAndRun } from '../compiler.js';
import { logger } from '../logger.js';

const shouldShowHelp = (args: readonly string[], helpFlag: boolean): boolean =>
  helpFlag || args.length === 0;

export const main = (): void => {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const needsHelp = shouldShowHelp(args, options.help ?? false);

  if (options.version) {
    showVersion();
    return;
  }

  if (needsHelp) {
    showHelp();
    return;
  }

  if (!options.scriptFile) {
    throw new Error('No script file provided');
  }

  if (options.outputFile) {
    buildExecutable(options.scriptFile, options.outputFile);
    return;
  }

  if (options.scriptFile) {
    compileAndRun(options.scriptFile);
  }
};

const isEntryPoint = (): boolean => {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  const currentModulePath = fileURLToPath(import.meta.url);

  try {
    return fs.realpathSync(currentModulePath) === fs.realpathSync(path.resolve(entryPath));
  } catch {
    return currentModulePath === path.resolve(entryPath);
  }
};

if (isEntryPoint()) {
  try {
    main();
    process.exit(EXIT_SUCCESS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    process.exit(EXIT_FAILURE);
  }
}
