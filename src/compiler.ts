import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { EXIT_FAILURE } from "./constants.js";
import { logger } from "./logger.js";
import { isTqsScript } from "./marker.js";

const stripExtension = (filePath: string): string => filePath.replace(/\.(ts|tqs|js)$/, "");

const toJsPath = (filePath: string): string => filePath.replace(/\.(ts|tqs)$/, ".js");

const exec = (args: string[]): number => {
  const [command, ...commandArgs] = args;
  if (!command) {
    return EXIT_FAILURE;
  }
  const result = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (result.error) {
    return EXIT_FAILURE;
  }
  return result.status ?? EXIT_FAILURE;
};

const hasTqsMarker = (filePath: string): boolean => {
  try {
    return isTqsScript(readFileSync(filePath, "utf8"));
  } catch {
    return false;
  }
};

const normalizeQuickJsImports = (filePath: string): void => {
  const contents = readFileSync(filePath, "utf8")
    .replace(/(["'])qjs:std\1/g, '"std"')
    .replace(/(["'])qjs:os\1/g, '"os"');
  writeFileSync(filePath, contents);
};

const buildJs = (inputFile: string): string => {
  const outFile = toJsPath(inputFile);
  const result = exec([
    "bun",
    "build",
    "--target",
    "browser",
    "--external",
    "std",
    "--external",
    "os",
    "--external",
    "qjs:std",
    "--external",
    "qjs:os",
    "--outfile",
    outFile,
    inputFile,
  ]);
  if (result !== 0) {
    logger.error(`build failed: ${inputFile}`);
    process.exit(EXIT_FAILURE);
  }
  normalizeQuickJsImports(outFile);
  return outFile;
};

const buildBinary = (jsFile: string, outputFile: string): void => {
  const result = exec(["qjsc", "-o", outputFile, jsFile]);
  if (result !== 0) {
    logger.error(`qjsc failed: ${jsFile}`);
    process.exit(EXIT_FAILURE);
  }
};

export const compile = (inputFile: string): void => {
  const outputFile = stripExtension(inputFile);
  const isTsOnly = inputFile.endsWith(".ts");
  const isTypeScript = /\.(ts|tqs)$/.test(inputFile);

  if (isTsOnly && !hasTqsMarker(inputFile)) {
    logger.error(
      `${inputFile} is missing // @tqs-script — add it to mark this file as a tqs script`,
    );
    process.exit(EXIT_FAILURE);
  }

  logger.step(`Compiling: ${inputFile} -> ${outputFile}`);

  const jsFile = isTypeScript ? buildJs(inputFile) : inputFile;
  buildBinary(jsFile, outputFile);

  if (isTypeScript) unlinkSync(jsFile);

  logger.success(`Built: ${outputFile}`);
};
