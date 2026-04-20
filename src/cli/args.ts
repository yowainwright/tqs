import type { ParsedArgs } from '../types.js';

const OUTPUT_FLAGS = new Set(['-o', '--output']);

export const parseArgs = (args: readonly string[]): ParsedArgs => {
  const helpFlag = args.includes('--help') || args.includes('-h');
  const versionFlag = args.includes('--version') || args.includes('-v');

  let scriptFile: string | undefined;
  let outputFile: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg) {
      continue;
    }

    if (OUTPUT_FLAGS.has(arg)) {
      const nextArg = args[index + 1];
      if (!nextArg || nextArg.startsWith('-')) {
        throw new Error(`Missing value for ${arg}`);
      }

      outputFile = nextArg;
      index++;
      continue;
    }

    if (!arg.startsWith('-') && !scriptFile) {
      scriptFile = arg;
    }
  }

  return {
    help: helpFlag,
    version: versionFlag,
    scriptFile,
    outputFile,
  };
};
