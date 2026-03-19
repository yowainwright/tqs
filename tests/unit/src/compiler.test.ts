import { describe, it, expect, afterEach } from 'bun:test';
import { compileAndRun } from '../../../src/compiler.js';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.join(__dirname, '../../fixtures');
const TEMP_DIR = 'test-files';

describe('compiler', () => {
  afterEach(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  it('should throw for non-existent file', () => {
    expect(() => compileAndRun('non-existent.ts')).toThrow("File 'non-existent.ts' not found");
  });

  it('should throw for unmarked file', () => {
    const unmarked = path.join(FIXTURES_DIR, 'unmarked.ts');
    expect(() => compileAndRun(unmarked)).toThrow('not marked for QuickJS execution');
  });

  it('should accept .tqs extension', () => {
    const fixture = path.join(FIXTURES_DIR, 'tqs-extension.tqs');
    try {
      compileAndRun(fixture);
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('not marked for QuickJS execution');
    }
  });

  it('should accept @tqs-script comment', () => {
    const fixture = path.join(FIXTURES_DIR, 'tqs-comment.ts');
    try {
      compileAndRun(fixture);
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('not marked for QuickJS execution');
    }
  });

  it('should accept file in scripts directory', () => {
    fs.mkdirSync(path.join(TEMP_DIR, 'scripts'), { recursive: true });
    const dirFixture = path.join(TEMP_DIR, 'scripts', 'detect-by-dir.ts');
    fs.writeFileSync(dirFixture, 'console.log("detect by dir");');

    try {
      compileAndRun(dirFixture);
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('not marked for QuickJS execution');
    }
  });
});
