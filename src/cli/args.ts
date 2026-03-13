import type { ParsedArgs } from '../types.js';

export const parseArgs = (args: readonly string[]): ParsedArgs => {
  const helpFlag = args.includes('--help') || args.includes('-h');
  const versionFlag = args.includes('--version') || args.includes('-v');

  const nonFlagArgs = args.filter(arg => !arg.startsWith('-'));
  const scriptFile = nonFlagArgs[0];

  return {
    help: helpFlag,
    version: versionFlag,
    scriptFile,
  };
};