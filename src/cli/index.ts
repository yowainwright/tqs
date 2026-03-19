import { EXIT_SUCCESS, EXIT_FAILURE } from '../constants.js';
import { parseArgs } from './args.js';
import { showHelp } from './help.js';
import { showVersion } from './version.js';
import { compileAndRun } from '../compiler.js';
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

  if (options.scriptFile) {
    compileAndRun(options.scriptFile);
  }
};

const isEntryPoint =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('/cli/index.ts') === true;

if (isEntryPoint) {
  try {
    main();
    process.exit(EXIT_SUCCESS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    process.exit(EXIT_FAILURE);
  }
}
