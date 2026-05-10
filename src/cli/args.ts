import type { ParsedArgs } from "../types.js";

export const parseArgs = (args: readonly string[]): ParsedArgs => {
  const helpFlag = args.includes("--help") || args.includes("-h");
  const versionFlag = args.includes("--version") || args.includes("-v");

  const oFlagIndex = args.indexOf("-o");
  const outputFile = oFlagIndex !== -1 ? args[oFlagIndex + 1] : undefined;

  const nonFlagArgs = args.filter((arg, i) => {
    const isPrevO = i > 0 && args[i - 1] === "-o";
    return !arg.startsWith("-") && !isPrevO;
  });
  const scriptFile = nonFlagArgs[0];

  return {
    help: helpFlag,
    version: versionFlag,
    scriptFile,
    outputFile,
  };
};
