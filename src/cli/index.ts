import { EXIT_SUCCESS } from '../constants.js';
import { parseArgs } from './args.js';
import { showHelp } from './help.js';
import { showVersion } from './version.js';
import { compileAndRun } from '../compiler.js';

const shouldShowHelp = (args: string[], helpFlag: boolean): boolean => {
  return helpFlag || args.length === 0;
};

export const main = (): void => {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const needsHelp = shouldShowHelp(args, options.help);

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
    return;
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
  process.exit(EXIT_SUCCESS);
}