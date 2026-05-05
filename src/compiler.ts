import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { EXIT_FAILURE } from "./constants.js";
import { logger } from "./logger.js";
import { isTqsScript } from "./marker.js";

const stripExtension = (filePath: string): string => filePath.replace(/\.(ts|tqs|js)$/, "");

const toJsPath = (filePath: string): string => filePath.replace(/\.(ts|tqs)$/, ".js");

const isEnoent = (error: Error): boolean =>
  (error as NodeJS.ErrnoException).code === "ENOENT";

const exec = (args: string[]): number => {
  const [command, ...commandArgs] = args;
  if (!command) return EXIT_FAILURE;
  const result = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (result.error) {
    if (isEnoent(result.error)) logger.error(`command not found: ${command}`);
    return EXIT_FAILURE;
  }
  return result.status ?? EXIT_FAILURE;
};

const isExecutable = (filePath: string): boolean =>
  existsSync(filePath) && (statSync(filePath).mode & 0o111) !== 0;

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
  const lastSlash = outFile.lastIndexOf("/");
  const outDir = lastSlash >= 0 ? outFile.slice(0, lastSlash) : ".";
  const result = exec([
    "bun",
    "build",
    "--target",
    "browser",
    "--loader",
    ".tqs:ts",
    "--external",
    "std",
    "--external",
    "os",
    "--external",
    "qjs:std",
    "--external",
    "qjs:os",
    "--outdir",
    outDir,
    inputFile,
  ]);
  if (result !== 0) {
    logger.error(`build failed: ${inputFile}`);
    process.exit(EXIT_FAILURE);
  }
  normalizeQuickJsImports(outFile);
  return outFile;
};

const compileWithQjsc = (jsFile: string, outputFile: string): number =>
  exec([
    "qjsc",
    "-m",
    "-o",
    outputFile,
    jsFile,
  ]);

const compileQjscSource = (jsFile: string, cFile: string): number =>
  exec([
    "qjsc",
    "-e",
    "-m",
    "-o",
    cFile,
    jsFile,
  ]);

const linkQjscSource = (cFile: string, outputFile: string): number =>
  exec([
    "cc",
    "-o",
    outputFile,
    cFile,
    "quickjs-ng/build/libqjs-libc.a",
    "quickjs-ng/build/libqjs.a",
    "-Iquickjs-ng",
    "-lm",
    "-ldl",
    "-pthread",
  ]);

const compileQjscNgBinary = (jsFile: string, outputFile: string): number => {
  const cFile = `${outputFile}.c`;
  const compileResult = compileQjscSource(jsFile, cFile);
  if (compileResult !== 0) return compileResult;
  const linkResult = linkQjscSource(cFile, outputFile);
  unlinkSync(cFile);
  return linkResult;
};

const buildBinary = (jsFile: string, outputFile: string): void => {
  const result = compileWithQjsc(jsFile, outputFile);
  if (result !== 0) {
    logger.error(`qjsc failed: ${jsFile}`);
    process.exit(EXIT_FAILURE);
  }
  if (isExecutable(outputFile)) return;
  if (compileQjscNgBinary(jsFile, outputFile) !== 0) {
    logger.error(`native link failed: ${jsFile}`);
    process.exit(EXIT_FAILURE);
  }
};

export const compile = (inputFile: string, outputFile?: string): void => {
  const resolvedOutput = outputFile ?? stripExtension(inputFile);
  const isTsOnly = inputFile.endsWith(".ts");
  const isTypeScript = /\.(ts|tqs)$/.test(inputFile);

  if (isTsOnly && !hasTqsMarker(inputFile)) {
    logger.error(
      `${inputFile} is missing // @tqs-script — add it to mark this file as a tqs script`,
    );
    process.exit(EXIT_FAILURE);
  }

  logger.step(`Compiling: ${inputFile} -> ${resolvedOutput}`);

  const jsFile = isTypeScript ? buildJs(inputFile) : inputFile;
  buildBinary(jsFile, resolvedOutput);

  if (isTypeScript) unlinkSync(jsFile);

  logger.success(`Built: ${resolvedOutput}`);
};
