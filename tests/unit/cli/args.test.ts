import { describe, it, expect } from 'bun:test';
import { parseArgs } from '../../../src/cli/args.js';

describe('parseArgs', () => {
  it('should parse help flags', () => {
    const result1 = parseArgs(['--help']);
    expect(result1.help).toBe(true);
    expect(result1.version).toBe(false);
    expect(result1.scriptFile).toBeUndefined();

    const result2 = parseArgs(['-h']);
    expect(result2.help).toBe(true);
  });

  it('should parse version flags', () => {
    const result1 = parseArgs(['--version']);
    expect(result1.version).toBe(true);
    expect(result1.help).toBe(false);
    expect(result1.scriptFile).toBeUndefined();

    const result2 = parseArgs(['-v']);
    expect(result2.version).toBe(true);
  });

  it('should parse script file argument', () => {
    const result = parseArgs(['my-script.ts']);
    expect(result.scriptFile).toBe('my-script.ts');
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
  });

  it('should handle mixed arguments', () => {
    const result = parseArgs(['--help', 'script.ts']);
    expect(result.help).toBe(true);
    expect(result.scriptFile).toBe('script.ts');
  });

  it('should handle empty arguments', () => {
    const result = parseArgs([]);
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
    expect(result.scriptFile).toBeUndefined();
  });

  it('should ignore flags when finding script file', () => {
    const result = parseArgs(['--help', '--version', 'test.tqs', '--other']);
    expect(result.scriptFile).toBe('test.tqs');
    expect(result.help).toBe(true);
    expect(result.version).toBe(true);
  });
});