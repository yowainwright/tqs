import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLI_PATH = path.join(__dirname, '../../dist/cli/index.js');
const TEST_DIR = 'integration-test-files';

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    const scriptsDir = path.join(TEST_DIR, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Help and Version', () => {
    it('should show help with --help flag', () => {
      const result = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf8' });

      expect(result).toContain('tqs - quick scripts for typescript');
      expect(result).toContain('Usage:');
      expect(result).toContain('--help');
      expect(result).toContain('--version');
    });

    it('should show help with -h flag', () => {
      const result = execSync(`node ${CLI_PATH} -h`, { encoding: 'utf8' });

      expect(result).toContain('tqs - quick scripts for typescript');
    });

    it('should show version with --version flag', () => {
      const result = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf8' });

      expect(result.trim()).toBe('1.0.0');
    });

    it('should show help when no arguments provided', () => {
      const result = execSync(`node ${CLI_PATH}`, { encoding: 'utf8' });

      expect(result).toContain('Usage:');
    });
  });

  describe('File Validation', () => {
    it('should fail for non-existent file', () => {
      expect(() => {
        execSync(`node ${CLI_PATH} non-existent.tqs`, { encoding: 'utf8' });
      }).toThrow();
    });

    it('should fail for non-QuickJS TypeScript file', () => {
      const regularTsFile = path.join(TEST_DIR, 'regular.ts');
      fs.writeFileSync(regularTsFile, 'console.log("Not a QuickJS file");');

      expect(() => {
        execSync(`node ${CLI_PATH} ${regularTsFile}`, { encoding: 'utf8' });
      }).toThrow();
    });

    it('should accept .tqs file', () => {
      const tqsFile = path.join(TEST_DIR, 'test.tqs');
      fs.writeFileSync(tqsFile, 'console.log("TQS file");');

      // Should not throw validation error (may fail at compilation/execution)
      try {
        execSync(`node ${CLI_PATH} ${tqsFile}`, { encoding: 'utf8' });
      } catch (error) {
        // Expected to fail at compilation since QuickJS binary doesn't exist yet
        expect(error.message).not.toContain('not marked for QuickJS execution');
      }
    });

    it('should accept file with @tqs-script comment', () => {
      const tsFile = path.join(TEST_DIR, 'commented.ts');
      fs.writeFileSync(tsFile, '// @tqs-script\nconsole.log("Commented QuickJS file");');

      try {
        execSync(`node ${CLI_PATH} ${tsFile}`, { encoding: 'utf8' });
      } catch (error) {
        // Expected to fail at compilation since QuickJS binary doesn't exist yet
        expect(error.message).not.toContain('not marked for QuickJS execution');
      }
    });

    it('should accept file in scripts directory', () => {
      const scriptsFile = path.join(TEST_DIR, 'scripts', 'fetch.ts');
      fs.writeFileSync(scriptsFile, 'console.log("Scripts directory file");');

      try {
        execSync(`node ${CLI_PATH} ${scriptsFile}`, { encoding: 'utf8' });
      } catch (error) {
        // Expected to fail at compilation since QuickJS binary doesn't exist yet
        expect(error.message).not.toContain('not marked for QuickJS execution');
      }
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error for non-QuickJS file', () => {
      const regularFile = path.join(TEST_DIR, 'regular.ts');
      fs.writeFileSync(regularFile, 'console.log("regular");');

      try {
        execSync(`node ${CLI_PATH} ${regularFile}`, { encoding: 'utf8', stdio: 'pipe' });
      } catch (error) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain('not marked for QuickJS execution');
        expect(stderr).toContain('.tqs file extension');
        expect(stderr).toContain('// @tqs-script comment');
        expect(stderr).toContain('scripts/, quickjs/, or tqs/ directory');
      }
    });

    it('should provide helpful error for unsupported file type', () => {
      const pyFile = path.join(TEST_DIR, 'test.py');
      fs.writeFileSync(pyFile, 'print("Python file")');

      try {
        execSync(`node ${CLI_PATH} ${pyFile}`, { encoding: 'utf8', stdio: 'pipe' });
      } catch (error) {
        const stderr = error.stderr?.toString() || '';
        expect(stderr).toContain('Unsupported file type');
        expect(stderr).toContain('Use .ts, .tqs, or .js files');
      }
    });
  });
});