import { describe, it, expect } from 'bun:test';
import { createRequire } from 'node:module';
import { execFileSync } from 'child_process';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

const ROOT_DIR = path.join(import.meta.dir, '../..');
const CLI_PATH = path.join(ROOT_DIR, 'dist/cli/index.js');
const BACKEND_PATH = path.join(ROOT_DIR, 'scripts/tqs-qjsc.sh');
const COMPILER_CACHE_DIR = '/tmp/tqs-cli-cache';
const hasCli = existsSync(CLI_PATH);
const hasCommand = (command: string): boolean => {
  try {
    execFileSync('sh', ['-c', `command -v ${command}`], { encoding: 'utf8', stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const hasQuickJsSources = (): boolean =>
  existsSync(path.join(ROOT_DIR, 'deps/quickjs-ng/qjsc.c')) ||
  existsSync(path.join(ROOT_DIR, 'quickjs-ng/qjsc.c'));
const hasBundledBackend = (): boolean =>
  existsSync(BACKEND_PATH) && hasCommand('cc') && hasQuickJsSources();

const run = (args: readonly string[] = [], env: Record<string, string> = {}): string =>
  execFileSync('bun', [CLI_PATH, ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      ...process.env,
      ...env,
    },
  });

describe.skipIf(!hasCli)('CLI Integration', () => {
  it('should show help with --help', () => {
    const result = run(['--help']);
    expect(result).toContain('Usage');
    expect(result).toContain('--help');
    expect(result).toContain('--version');
    expect(result).toContain('-o <output>');
  });

  it('should show help with -h', () => {
    const result = run(['-h']);
    expect(result).toContain('compile typescript');
  });

  it('should show version with --version', () => {
    const result = run(['--version']);
    expect(result.trim()).toContain(version);
  });

  it('should show help when no arguments provided', () => {
    const result = run();
    expect(result).toContain('Usage');
  });

  it('should fail when no script is provided with output flag', () => {
    expect(() => run(['-o', 'out'])).toThrow();
  });

  it('should fail for non-existent file', () => {
    expect(() => run(['non-existent.tqs'])).toThrow();
  });

  it('should fail for .ts file without @tqs-script marker', () => {
    const fixture = path.join(import.meta.dir, '../fixtures/unmarked.ts');
    expect(() => run([fixture])).toThrow();
  });

  it('should reject qjsc commands that produce C source instead of executables', () => {
    const tempDir = mkdtempSync('/tmp/tqs-cli-');
    const fakeQjscPath = path.join(tempDir, 'qjsc');
    const scriptPath = path.join(tempDir, 'build-me.ts');
    const outputPath = path.join(tempDir, 'build-me');

    try {
      writeFileSync(
        fakeQjscPath,
        '#!/bin/sh\nwhile [ "$#" -gt 0 ]; do if [ "$1" = "-o" ]; then shift; out="$1"; fi; shift; done\nprintf "/* File generated automatically by fake qjsc. */\\n" > "$out"\n',
      );
      chmodSync(fakeQjscPath, 0o755);
      writeFileSync(scriptPath, '// @tqs-script\nconsole.log("hello");\n');

      expect(() => run([scriptPath, '-o', outputPath], { TQS_QJSC: fakeQjscPath })).toThrow();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it.skipIf(!hasBundledBackend())('should build a standalone executable with -o', () => {
    const tempDir = mkdtempSync('/tmp/tqs-cli-');
    const scriptPath = path.join(tempDir, 'build-me.ts');
    const outputPath = path.join(tempDir, 'build-me');

    try {
      writeFileSync(
        scriptPath,
        '// @tqs-script\nimport * as std from "qjs:std";\nstd.printf("standalone build works\\n");\n',
      );

      run([scriptPath, '-o', outputPath], { TQS_CACHE_DIR: COMPILER_CACHE_DIR });

      const result = execFileSync(outputPath, [], { encoding: 'utf8', stdio: 'pipe' });
      expect(result).toContain('standalone build works');
      expect(existsSync(path.join(tempDir, 'build-me.js'))).toBe(false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60000);

  it.skipIf(!hasBundledBackend())('should inject maybefetch into compiled binaries', () => {
    const tempDir = mkdtempSync('/tmp/tqs-cli-');
    const scriptPath = path.join(tempDir, 'maybefetch.ts');
    const outputPath = path.join(tempDir, 'maybefetch');

    try {
      writeFileSync(
        scriptPath,
        [
          '// @tqs-script',
          'import * as std from "qjs:std";',
          'if (typeof maybefetch !== "function") {',
          '  std.err.puts("missing maybefetch global\\n");',
          '  std.exit(1);',
          '}',
          'const result = maybefetch("http://invalid-domain-that-does-not-exist.internal", 1, 1, 1, 1, 1);',
          'if (result !== null) {',
          '  std.err.puts("expected null result\\n");',
          '  std.exit(1);',
          '}',
          'std.out.puts("maybefetch injected\\n");',
          '',
        ].join('\n'),
      );

      run([scriptPath, '-o', outputPath], { TQS_CACHE_DIR: COMPILER_CACHE_DIR });

      const result = execFileSync(outputPath, [], { encoding: 'utf8', stdio: 'pipe' });
      expect(result).toContain('maybefetch injected');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);
});
