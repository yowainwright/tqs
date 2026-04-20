import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const SUPPORTED_EXTENSIONS = ['.ts', '.tqs', '.tsq', '.js'] as const;
const QUICKJS_DIRECTORIES = ['scripts', 'quickjs', 'tqs'] as const;
const TQS_MARKERS = ['// @tqs-script', '// @tqs'] as const;
const FIRST_LINES_TO_CHECK = 5;
const QUICKJS_EXTERNAL_MODULES = ['std', 'os', 'qjs:std', 'qjs:os'] as const;
const EMBEDDED_SCRIPT_C_NAME = 'tqs_embedded_script';

let packageRootCache: string | null = null;

const fileExists = (filePath: string): boolean =>
  fs.existsSync(filePath);

const getFileExtension = (filePath: string): string =>
  path.extname(filePath).toLowerCase();

const getDirectoryName = (filePath: string): string =>
  path.basename(path.dirname(filePath)).toLowerCase();

const readFileContent = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

const hasQuickJSExtension = (filePath: string): boolean => {
  const ext = getFileExtension(filePath);
  return ext === '.tqs' || ext === '.tsq';
};

const hasQuickJSDirectory = (filePath: string): boolean => {
  const dirName = getDirectoryName(filePath);
  return (QUICKJS_DIRECTORIES as readonly string[]).includes(dirName);
};

const hasQuickJSComment = (filePath: string): boolean => {
  const content = readFileContent(filePath);
  if (!content) return false;

  const firstLines = content.split('\n').slice(0, FIRST_LINES_TO_CHECK).join('\n');
  return TQS_MARKERS.some(marker => firstLines.includes(marker));
};

const isQuickJSFile = (filePath: string): boolean =>
  hasQuickJSExtension(filePath) ||
  hasQuickJSDirectory(filePath) ||
  hasQuickJSComment(filePath);

const getCompilerDir = (): string =>
  import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

const findPackageRoot = (): string => {
  if (packageRootCache) {
    return packageRootCache;
  }

  let currentDir = getCompilerDir();

  while (true) {
    if (fileExists(path.join(currentDir, 'package.json'))) {
      packageRootCache = currentDir;
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error('Unable to locate package root from compiler path.');
    }
    currentDir = parentDir;
  }
};

const getQuickJSDirCandidates = (): readonly string[] => {
  const packageRoot = findPackageRoot();

  return [
    path.join(packageRoot, 'deps', 'quickjs-ng'),
    path.join(packageRoot, 'quickjs-ng'),
  ];
};

const getQuickJSDir = (): string => {
  for (const candidate of getQuickJSDirCandidates()) {
    if (fileExists(path.join(candidate, 'quickjs.c'))) {
      return candidate;
    }
  }

  return getQuickJSDirCandidates()[0] as string;
};

const getQjscBinaryPath = (): string =>
  path.join(findPackageRoot(), 'bin', 'qjsc');

const getNativeIncludeDir = (): string =>
  path.join(findPackageRoot(), 'native', 'include');

const getNativeSourceDir = (): string =>
  path.join(findPackageRoot(), 'native', 'src');

const createTempDir = (prefix: string): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), prefix));

const removePath = (filePath: string): void => {
  if (!fileExists(filePath)) {
    return;
  }

  fs.rmSync(filePath, { recursive: true, force: true });
};

const ensureDirectoryExists = (dirPath: string): void => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const executeCommand = (command: string, args: readonly string[], cwd?: string): void => {
  execFileSync(command, [...args], {
    cwd,
    stdio: 'inherit',
  });
};

const validateFileExists = (filePath: string): void => {
  if (!fileExists(filePath)) {
    throw new Error(`File '${filePath}' not found`);
  }
};

const validateQuickJSFile = (filePath: string): void => {
  if (!isQuickJSFile(filePath)) {
    const message = [
      `File '${filePath}' is not marked for QuickJS execution.`,
      'Use one of:',
      '  1. .tqs or .tsq file extension',
      '  2. // @tqs-script comment at top of file',
      '  3. Place in scripts/, quickjs/, or tqs/ directory',
    ].join('\n');
    throw new Error(message);
  }
};

const validateFileType = (filePath: string): void => {
  const ext = getFileExtension(filePath);
  const isSupported = (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);

  if (!isSupported) {
    throw new Error(`Unsupported file type '${ext}'. Use .ts, .tqs, .tsq, or .js files.`);
  }
};

const ensureQuickJSSource = (): string => {
  const quickjsDir = getQuickJSDir();

  if (!fileExists(path.join(quickjsDir, 'quickjs.c'))) {
    throw new Error(
      `QuickJS source not found at '${quickjsDir}'. Run 'npm run stage:quickjs' or ensure the package includes 'deps/quickjs-ng/'.`
    );
  }

  return quickjsDir;
};

const getQjscBuildArgs = (outputPath: string): string[] => {
  const quickjsDir = ensureQuickJSSource();

  return [
    '-D_GNU_SOURCE',
    '-DCONFIG_VERSION="tqs"',
    '-I.',
    'qjsc.c',
    'quickjs.c',
    'quickjs-libc.c',
    'libregexp.c',
    'libunicode.c',
    'dtoa.c',
    '-lm',
    '-ldl',
    '-lpthread',
    '-o',
    outputPath,
  ];
};

const ensureQjscBinary = (): string => {
  const qjscPath = getQjscBinaryPath();
  if (fileExists(qjscPath)) {
    return qjscPath;
  }

  ensureDirectoryExists(path.dirname(qjscPath));
  logger.info(`Building QuickJS compiler: ${qjscPath}`);
  executeCommand('cc', getQjscBuildArgs(qjscPath), ensureQuickJSSource());
  return qjscPath;
};

const createBundlerEntry = (inputFile: string): { readonly entryFile: string; readonly cleanup: () => void } => {
  const ext = getFileExtension(inputFile);

  if (ext !== '.tqs' && ext !== '.tsq') {
    return {
      entryFile: inputFile,
      cleanup: (): void => {},
    };
  }

  const sourceDir = path.dirname(inputFile);
  const sourceBaseName = path.basename(inputFile, ext);
  const tempEntry = path.join(
    sourceDir,
    `.${sourceBaseName}.tqs-build-${process.pid}-${Date.now()}.ts`
  );

  fs.copyFileSync(inputFile, tempEntry);

  return {
    entryFile: tempEntry,
    cleanup: (): void => {
      removePath(tempEntry);
    },
  };
};

const bundleScript = (inputFile: string): { readonly bundlePath: string; readonly cleanup: () => void } => {
  const tempDir = createTempDir('tqs-bundle-');
  const { entryFile, cleanup: cleanupEntry } = createBundlerEntry(inputFile);
  const bundlePath = path.join(tempDir, 'bundle.js');

  try {
    const args = [
      'build',
      entryFile,
      `--outfile=${bundlePath}`,
      '--format=esm',
      '--target=browser',
      '--sourcemap=none',
      ...QUICKJS_EXTERNAL_MODULES.map(moduleName => `--external=${moduleName}`),
    ];

    logger.info(`Bundling script: ${inputFile}`);
    executeCommand('bun', args);
  } catch (err) {
    cleanupEntry();
    removePath(tempDir);
    throw err;
  }

  return {
    bundlePath,
    cleanup: (): void => {
      cleanupEntry();
      removePath(tempDir);
    },
  };
};

const generateEmbeddedScript = (bundlePath: string, workingDir: string): string => {
  const generatedSourcePath = path.join(workingDir, 'embedded-script.c');

  logger.info(`Generating QuickJS bytecode: ${bundlePath}`);
  executeCommand(ensureQjscBinary(), [
    '-m',
    '-N',
    EMBEDDED_SCRIPT_C_NAME,
    '-o',
    generatedSourcePath,
    bundlePath,
  ]);

  return generatedSourcePath;
};

const createLauncherSource = (workingDir: string): string => {
  const launcherPath = path.join(workingDir, 'launcher.c');
  const launcherSource = `#include <stdio.h>
#include "quickjs-libc.h"
#include "maybefetch.h"

extern const uint8_t ${EMBEDDED_SCRIPT_C_NAME}[];
extern const uint32_t ${EMBEDDED_SCRIPT_C_NAME}_size;
extern void js_std_add_maybefetch(JSContext *ctx);

static JSContext *JS_NewCustomContext(JSRuntime *rt)
{
    JSContext *ctx = JS_NewContext(rt);
    if (!ctx) {
        return NULL;
    }

    js_init_module_std(ctx, "qjs:std");
    js_init_module_os(ctx, "qjs:os");
    js_init_module_std(ctx, "std");
    js_init_module_os(ctx, "os");
    js_std_add_maybefetch(ctx);
    return ctx;
}

int main(int argc, char **argv)
{
    JSRuntime *rt = JS_NewRuntime();
    if (!rt) {
        fprintf(stderr, "tqs: cannot allocate JS runtime\\n");
        return 2;
    }

    js_std_init_handlers(rt);
    JS_SetModuleLoaderFunc2(rt, NULL, js_module_loader, js_module_check_attributes, NULL);
    JS_SetHostPromiseRejectionTracker(rt, js_std_promise_rejection_tracker, NULL);

    JSContext *ctx = JS_NewCustomContext(rt);
    if (!ctx) {
        fprintf(stderr, "tqs: cannot allocate JS context\\n");
        js_std_free_handlers(rt);
        JS_FreeRuntime(rt);
        return 2;
    }

    js_std_add_helpers(ctx, argc, argv);
    js_std_eval_binary(ctx, ${EMBEDDED_SCRIPT_C_NAME}, ${EMBEDDED_SCRIPT_C_NAME}_size, 0);

    int rc = js_std_loop(ctx);
    if (rc) {
        js_std_dump_error(ctx);
    }

    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return rc ? 1 : 0;
}
`;

  fs.writeFileSync(launcherPath, launcherSource);
  return launcherPath;
};

const getExecutableBuildArgs = (
  launcherPath: string,
  embeddedScriptPath: string,
  outputPath: string
): string[] => {
  const quickjsDir = ensureQuickJSSource();
  const nativeSourceDir = getNativeSourceDir();

  return [
    '-D_GNU_SOURCE',
    '-DCONFIG_VERSION="tqs"',
    '-I',
    quickjsDir,
    '-I',
    getNativeIncludeDir(),
    launcherPath,
    embeddedScriptPath,
    path.join(quickjsDir, 'quickjs.c'),
    path.join(quickjsDir, 'quickjs-libc.c'),
    path.join(quickjsDir, 'libregexp.c'),
    path.join(quickjsDir, 'libunicode.c'),
    path.join(quickjsDir, 'dtoa.c'),
    path.join(nativeSourceDir, 'maybefetch.c'),
    path.join(nativeSourceDir, 'quickjs_maybefetch.c'),
    '-lcurl',
    '-lm',
    '-ldl',
    '-lpthread',
    '-o',
    outputPath,
  ];
};

const compileStandaloneExecutable = (
  embeddedScriptPath: string,
  outputPath: string,
  workingDir: string
): void => {
  const resolvedOutputPath = path.resolve(outputPath);
  const launcherPath = createLauncherSource(workingDir);

  ensureDirectoryExists(path.dirname(resolvedOutputPath));
  logger.info(`Building executable: ${resolvedOutputPath}`);
  executeCommand(
    'cc',
    getExecutableBuildArgs(launcherPath, embeddedScriptPath, resolvedOutputPath)
  );
};

const buildStandaloneExecutable = (inputFile: string, outputPath: string): void => {
  const bundle = bundleScript(inputFile);
  const workingDir = createTempDir('tqs-quickjs-');

  try {
    const embeddedScriptPath = generateEmbeddedScript(bundle.bundlePath, workingDir);
    compileStandaloneExecutable(embeddedScriptPath, outputPath, workingDir);
  } finally {
    bundle.cleanup();
    removePath(workingDir);
  }
};

export const buildExecutable = (filePath: string, outputPath: string): void => {
  validateFileExists(filePath);
  validateQuickJSFile(filePath);
  validateFileType(filePath);

  buildStandaloneExecutable(filePath, outputPath);
};

export const compileAndRun = (filePath: string): void => {
  const tempDir = createTempDir('tqs-run-');
  const executablePath = path.join(tempDir, 'script');

  try {
    buildExecutable(filePath, executablePath);
    logger.info(`Running standalone executable: ${executablePath}`);
    executeCommand(executablePath, []);
  } finally {
    removePath(tempDir);
  }
};
