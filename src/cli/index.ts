import * as std from 'qjs:std';
import { EXIT_SUCCESS, EXIT_FAILURE } from '../constants.js';
import { parseArgs } from './args.js';
import { showHelp } from './help.js';
import { showVersion } from './version.js';
import { compile } from '../compiler.js';
import { logger } from '../logger.js';

declare const scriptArgs: string[];

const args = scriptArgs.slice(1);
const options = parseArgs(args);

const shouldShowHelp = options.help || args.length === 0;

if (options.version) {
  showVersion();
  std.exit(EXIT_SUCCESS);
}

if (shouldShowHelp) {
  showHelp();
  std.exit(EXIT_SUCCESS);
}

if (options.scriptFile) {
  try {
    compile(options.scriptFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    std.exit(EXIT_FAILURE);
  }
}
