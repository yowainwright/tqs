import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT_FAILURE } from "./constants.js";
import { logger } from "./logger.js";
import { isTqsScript } from "./marker.js";

const stripExtension = (filePath: string): string => filePath.replace(/\.(ts|tqs|js)$/, "");

const toJsPath = (filePath: string): string => filePath.replace(/\.(ts|tqs)$/, ".js");

const isEnoent = (error: Error): boolean => (error as NodeJS.ErrnoException).code === "ENOENT";

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

const packageRoot = (): string => {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return (
    [moduleDir, dirname(moduleDir), dirname(dirname(moduleDir))].find((dir) =>
      existsSync(join(dir, "package.json")),
    ) ?? process.cwd()
  );
};

const quickJsSourceDir = (rootDir: string): string => join(rootDir, "deps/quickjs-ng");

const quickJsSources = (sourceDir: string): readonly string[] => [
  join(sourceDir, "quickjs-libc.c"),
  join(sourceDir, "quickjs.c"),
  join(sourceDir, "libregexp.c"),
  join(sourceDir, "libunicode.c"),
  join(sourceDir, "dtoa.c"),
];

const nativeSources = (rootDir: string): readonly string[] => [
  join(rootDir, "native/src/maybefetch.c"),
  join(rootDir, "native/src/quickjs_maybefetch.c"),
];

const nativeIncludeDir = (rootDir: string): string => join(rootDir, "native/include");

const requiredNativeFiles = (rootDir: string, sourceDir: string): readonly string[] => [
  ...quickJsSources(sourceDir),
  ...nativeSources(rootDir),
  join(nativeIncludeDir(rootDir), "maybefetch.h"),
];

const hasNativeFiles = (rootDir: string, sourceDir: string): boolean =>
  requiredNativeFiles(rootDir, sourceDir).every((filePath) => existsSync(filePath));

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

const compileQjscSource = (jsFile: string, cFile: string): number =>
  exec(["qjsc", "-e", "-m", "-o", cFile, jsFile]);

const addMaybefetchBinding = (cFile: string): boolean => {
  const contents = readFileSync(cFile, "utf8");
  const nextContents = contents
    .replace(
      '#include "quickjs-libc.h"',
      '#include "quickjs-libc.h"\nextern void js_std_add_maybefetch(JSContext *ctx);',
    )
    .replace(
      "  return ctx;\n}\n\nint main",
      "  js_std_add_maybefetch(ctx);\n  return ctx;\n}\n\nint main",
    );
  writeFileSync(cFile, nextContents);
  return nextContents !== contents;
};

const linkQjscSource = (
  cFile: string,
  outputFile: string,
  rootDir: string,
  sourceDir: string,
): number =>
  exec([
    "cc",
    "-o",
    outputFile,
    "-D_GNU_SOURCE",
    cFile,
    ...quickJsSources(sourceDir),
    ...nativeSources(rootDir),
    `-I${sourceDir}`,
    `-I${nativeIncludeDir(rootDir)}`,
    "-lm",
    "-ldl",
    "-pthread",
    "-lcurl",
  ]);

const cleanupIfExists = (filePath: string): void => {
  if (existsSync(filePath)) unlinkSync(filePath);
};

const compileQjscNgBinary = (jsFile: string, outputFile: string): number => {
  const cFile = `${outputFile}.c`;
  const rootDir = packageRoot();
  const sourceDir = quickJsSourceDir(rootDir);
  if (!hasNativeFiles(rootDir, sourceDir)) {
    logger.error(`quickjs sources missing — run: bun run stage:quickjs`);
    return EXIT_FAILURE;
  }
  const compileResult = compileQjscSource(jsFile, cFile);
  if (compileResult !== 0) {
    cleanupIfExists(cFile);
    return compileResult;
  }
  if (!addMaybefetchBinding(cFile)) {
    unlinkSync(cFile);
    logger.error(`maybefetch patch failed — qjsc output format changed`);
    return EXIT_FAILURE;
  }
  const linkResult = linkQjscSource(cFile, outputFile, rootDir, sourceDir);
  unlinkSync(cFile);
  return linkResult;
};

const buildBinary = (jsFile: string, outputFile: string): void => {
  if (compileQjscNgBinary(jsFile, outputFile) === 0) return;
  logger.error(`native link failed: ${jsFile}`);
  process.exit(EXIT_FAILURE);
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
