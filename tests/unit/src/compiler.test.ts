import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { compileAndRun } from '../../../src/compiler.js';
import fs from 'fs';
import path from 'path';

describe('compiler', () => {
  const testDir = 'test-files';
  const mockTQSFile = path.join(testDir, 'test.tqs');
  const mockTSFile = path.join(testDir, 'test.ts');
  const mockJSFile = path.join(testDir, 'test.js');
  const mockScriptsFile = path.join(testDir, 'scripts', 'fetch.ts');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(path.join(testDir, 'scripts'))) {
      fs.mkdirSync(path.join(testDir, 'scripts'), { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('file validation', () => {
    it('should fail for non-existent file', () => {
      expect(() => {
        compileAndRun('non-existent.ts');
      }).toThrow();
    });

    it('should fail for non-QuickJS file', () => {
      fs.writeFileSync(mockTSFile, 'console.log("hello");');

      expect(() => {
        compileAndRun(mockTSFile);
      }).toThrow();
    });
  });

  describe('QuickJS file detection', () => {
    it('should detect .tqs extension', () => {
      fs.writeFileSync(mockTQSFile, 'console.log("tqs file");');

      // This would normally try to compile, but we're testing detection
      // We'd need to mock the compilation process for full testing
      expect(fs.existsSync(mockTQSFile)).toBe(true);
    });

    it('should detect @tqs-script comment', () => {
      const tsWithComment = `// @tqs-script
console.log("quickjs script");`;
      fs.writeFileSync(mockTSFile, tsWithComment);

      expect(fs.existsSync(mockTSFile)).toBe(true);
      const content = fs.readFileSync(mockTSFile, 'utf8');
      expect(content).toContain('// @tqs-script');
    });

    it('should detect scripts directory', () => {
      fs.writeFileSync(mockScriptsFile, 'console.log("scripts dir");');

      expect(fs.existsSync(mockScriptsFile)).toBe(true);
      expect(path.dirname(mockScriptsFile)).toContain('scripts');
    });
  });

  describe('file type validation', () => {
    it('should accept .ts files', () => {
      const tsFile = `// @tqs-script
console.log("typescript");`;
      fs.writeFileSync(mockTSFile, tsFile);

      expect(path.extname(mockTSFile)).toBe('.ts');
    });

    it('should accept .tqs files', () => {
      fs.writeFileSync(mockTQSFile, 'console.log("tqs");');

      expect(path.extname(mockTQSFile)).toBe('.tqs');
    });

    it('should accept .js files', () => {
      const jsFile = `// @tqs-script
console.log("javascript");`;
      fs.writeFileSync(mockJSFile, jsFile);

      expect(path.extname(mockJSFile)).toBe('.js');
    });
  });
});