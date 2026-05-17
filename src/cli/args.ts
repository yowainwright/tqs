import type { ParsedArgs } from "../types.js";

const OUTPUT_FLAGS = ["-o", "--output"];
const OUTPUT_PREFIX = "--output=";

const isOutputFlag = (arg: string): boolean => OUTPUT_FLAGS.includes(arg);

const outputFromEqualsArg = (args: readonly string[]): string | undefined => {
  const value = args.find((arg) => arg.startsWith(OUTPUT_PREFIX))?.slice(OUTPUT_PREFIX.length);
  return value || undefined;
};

const outputFromSeparateArg = (args: readonly string[]): string | undefined => {
  const outputFlagIndex = args.findIndex(isOutputFlag);
  return outputFlagIndex === -1 ? undefined : args[outputFlagIndex + 1];
};

const isOutputValue = (args: readonly string[], index: number): boolean =>
  isOutputFlag(args[index - 1] ?? "");

const isPositionalArg = (args: readonly string[], arg: string, index: number): boolean =>
  !arg.startsWith("-") && !isOutputValue(args, index);

export const parseArgs = (args: readonly string[]): ParsedArgs => {
  const helpFlag = args.includes("--help") || args.includes("-h");
  const versionFlag = args.includes("--version") || args.includes("-v");
  const outputFile = outputFromEqualsArg(args) ?? outputFromSeparateArg(args);

  const nonFlagArgs = args.filter((arg, index) => isPositionalArg(args, arg, index));
  const scriptFile = nonFlagArgs[0];

  return {
    help: helpFlag,
    version: versionFlag,
    scriptFile,
    outputFile,
  };
};
