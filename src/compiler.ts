import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT_FAILURE } from "./constants.js";
import { logger } from "./logger.js";
import { isTqsScript } from "./marker.js";

const stripExtension = (filePath: string): string => filePath.replace(/\.(ts|tqs|js)$/, "");
const QJSC_ENV_VAR = "TQS_QJSC";

interface CommandInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly display: string;
}

const isEnoent = (error: Error): boolean => (error as NodeJS.ErrnoException).code === "ENOENT";

const toJsPath = (filePath: string, outDir: string): string =>
  path.join(outDir, `${stripExtension(path.basename(filePath))}.js`);

const bundledQjscBackend = (): string | undefined => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, "../..", "scripts", "tqs-qjsc.sh"),
    path.resolve(currentDir, "..", "scripts", "tqs-qjsc.sh"),
    path.resolve(process.cwd(), "scripts", "tqs-qjsc.sh"),
  ];

  return candidates.find((backend) => existsSync(backend));
};

const qjscCommand = (args: readonly string[]): CommandInvocation => {
  const override = process.env[QJSC_ENV_VAR];
  if (override) {
    return { command: override, args, display: override };
  }

  const backend = bundledQjscBackend();
  if (backend) {
    return { command: "bash", args: [backend, ...args], display: backend };
  }

  return { command: "qjsc", args, display: "qjsc" };
};

const exec = (args: readonly string[]): number => {
  const [command, ...commandArgs] = args;
  if (!command) return EXIT_FAILURE;
  const result = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (result.error) {
    if (isEnoent(result.error)) logger.error(`command not found: ${command}`);
    return EXIT_FAILURE;
  }
  return result.status ?? EXIT_FAILURE;
};

const execInvocation = (invocation: CommandInvocation): number => {
  const result = spawnSync(invocation.command, [...invocation.args], { stdio: "inherit" });
  if (result.error) {
    if (isEnoent(result.error)) logger.error(`command not found: ${invocation.command}`);
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

const buildJs = (inputFile: string, outDir: string): string => {
  const outFile = toJsPath(inputFile, outDir);
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
    "--outfile",
    outFile,
    inputFile,
  ]);
  if (result !== 0) {
    throw new Error(`build failed: ${inputFile}`);
  }
  normalizeQuickJsImports(outFile);
  return outFile;
};

const isGeneratedCSource = (filePath: string): boolean => {
  const header = readFileSync(filePath, "utf8").slice(0, 80);
  return header.startsWith("/* File generated automatically by");
};

const buildBinary = (jsFile: string, outputFile: string): void => {
  const invocation = qjscCommand(["-o", outputFile, jsFile]);
  const result = execInvocation(invocation);
  if (result !== 0) {
    throw new Error(`qjsc failed: ${jsFile}`);
  }
  if (isGeneratedCSource(outputFile)) {
    throw new Error(
      `${invocation.display} produced C source instead of an executable. Set ${QJSC_ENV_VAR} to a qjsc-compatible backend that emits native binaries.`,
    );
  }
  chmodSync(outputFile, 0o755);
};

const makeTempDir = (): string => mkdtempSync(path.join(tmpdir(), "tqs-"));

export const compile = (inputFile: string, outputFile = stripExtension(inputFile)): void => {
  const isTsOnly = inputFile.endsWith(".ts");
  const isTypeScript = /\.(ts|tqs)$/.test(inputFile);

  if (isTsOnly && !hasTqsMarker(inputFile)) {
    throw new Error(
      `${inputFile} is missing // @tqs-script — add it to mark this file as a tqs script`,
    );
  }

  logger.step(`Compiling: ${inputFile} -> ${outputFile}`);

  const tempDir = isTypeScript ? makeTempDir() : undefined;

  try {
    const jsFile = tempDir ? buildJs(inputFile, tempDir) : inputFile;
    buildBinary(jsFile, outputFile);
  } finally {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  }

  logger.success(`Built: ${outputFile}`);
};
