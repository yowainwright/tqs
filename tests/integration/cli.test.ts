import { describe, it, expect } from 'bun:test';
import { createRequire } from 'node:module';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

const BIN_PATH = path.join(import.meta.dir, '../../bin/tqs');
const hasBinary = existsSync(BIN_PATH);

const run = (args: string): string =>
  execSync(`${BIN_PATH} ${args}`, { encoding: 'utf8', stdio: 'pipe' });

describe.skipIf(!hasBinary)('CLI Integration', () => {
  it('should show help with --help', () => {
    const result = run('--help');
    expect(result).toContain('Usage');
    expect(result).toContain('--help');
    expect(result).toContain('--version');
  });

  it('should show help with -h', () => {
    const result = run('-h');
    expect(result).toContain('quick scripts for typescript');
  });

  it('should show version with --version', () => {
    const result = run('--version');
    expect(result.trim()).toContain(version);
  });

  it('should show help when no arguments provided', () => {
    const result = run('');
    expect(result).toContain('Usage');
  });

  it('should fail for non-existent file', () => {
    expect(() => run('non-existent.tqs')).toThrow();
  });

  it('should fail for .ts file without @tqs-script marker', () => {
    const fixture = path.join(import.meta.dir, '../fixtures/unmarked.ts');
    expect(() => run(fixture)).toThrow();
  });

  it('should accept .ts file with @tqs-script marker', () => {
    const fixture = path.join(import.meta.dir, '../fixtures/tqs-comment.ts');
    expect(() => run(fixture)).not.toThrow();
  });
});
