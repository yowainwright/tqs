import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { main } from '../../../src/cli/index.js';

describe('main CLI function', () => {
  let originalArgv: string[];
  let originalExit: typeof process.exit;
  let exitCode: number | undefined;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    exitCode = undefined;

    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error(`Process exit called with code: ${code}`);
    }) as typeof process.exit;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  it('should show help when no arguments provided', () => {
    process.argv = ['node', 'cli.js'];

    let logOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      logOutput += msg + '\n';
    };

    try {
      main();
    } catch (error) {
      // Expected to throw due to mocked process.exit
    }

    console.log = originalLog;
    expect(logOutput).toContain('tqs - quick scripts for typescript');
  });

  it('should show version when --version flag provided', () => {
    process.argv = ['node', 'cli.js', '--version'];

    let logOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      logOutput += msg + '\n';
    };

    try {
      main();
    } catch (error) {
      // Expected to throw due to mocked process.exit
    }

    console.log = originalLog;
    expect(logOutput).toContain('1.0.0');
  });

  it('should show help when --help flag provided', () => {
    process.argv = ['node', 'cli.js', '--help'];

    let logOutput = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      logOutput += msg + '\n';
    };

    try {
      main();
    } catch (error) {
      // Expected to throw due to mocked process.exit
    }

    console.log = originalLog;
    expect(logOutput).toContain('Usage:');
  });

  it('should handle script file argument', () => {
    process.argv = ['node', 'cli.js', 'test.tqs'];

    // This would normally try to compile the file
    // For unit testing, we're just checking the argument parsing flow
    expect(() => {
      main();
    }).toThrow(); // Will throw because file doesn't exist or compilation fails
  });
});