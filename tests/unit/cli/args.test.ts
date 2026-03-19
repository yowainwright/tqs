import { describe, it, expect } from 'bun:test';
import { parseArgs } from '../../../src/cli/args.js';

describe('parseArgs', () => {
  it('should parse --help flag', () => {
    const result = parseArgs(['--help']);
    expect(result.help).toBe(true);
    expect(result.version).toBe(false);
    expect(result.scriptFile).toBeUndefined();
  });

  it('should parse -h shorthand', () => {
    const result = parseArgs(['-h']);
    expect(result.help).toBe(true);
  });

  it('should parse --version flag', () => {
    const result = parseArgs(['--version']);
    expect(result.version).toBe(true);
    expect(result.help).toBe(false);
    expect(result.scriptFile).toBeUndefined();
  });

  it('should parse -v shorthand', () => {
    const result = parseArgs(['-v']);
    expect(result.version).toBe(true);
  });

  it('should parse script file as first non-flag arg', () => {
    const result = parseArgs(['my-script.ts']);
    expect(result.scriptFile).toBe('my-script.ts');
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
  });

  it('should separate flags from script file', () => {
    const result = parseArgs(['--help', '--version', 'test.tqs', '--other']);
    expect(result.scriptFile).toBe('test.tqs');
    expect(result.help).toBe(true);
    expect(result.version).toBe(true);
  });

  it('should return defaults for empty args', () => {
    const result = parseArgs([]);
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
    expect(result.scriptFile).toBeUndefined();
  });
});
