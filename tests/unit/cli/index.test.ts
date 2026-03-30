import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { main } from '../../../src/cli/index.js';

describe('main', () => {
  let originalArgv: string[];
  let originalWrite: typeof process.stdout.write;
  let logOutput: string;

  beforeEach(() => {
    originalArgv = process.argv;
    originalWrite = process.stdout.write.bind(process.stdout);
    logOutput = '';
    process.stdout.write = ((chunk: unknown) => {
      logOutput += String(chunk);
      return true;
    }) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.stdout.write = originalWrite;
  });

  it('should show help when no arguments provided', () => {
    process.argv = ['node', 'cli.js'];
    main();
    expect(logOutput).toContain('Usage');
  });

  it('should show help with --help flag', () => {
    process.argv = ['node', 'cli.js', '--help'];
    main();
    expect(logOutput).toContain('Usage');
  });

  it('should show version with --version flag', () => {
    process.argv = ['node', 'cli.js', '--version'];
    main();
    expect(logOutput).toContain('1.0.0');
  });

  it('should throw for non-existent script file', () => {
    process.argv = ['node', 'cli.js', 'missing.tqs'];
    expect(() => main()).toThrow();
  });
});
