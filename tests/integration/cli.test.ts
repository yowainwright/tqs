import { describe, it, expect, afterEach } from 'bun:test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLI_PATH = path.join(__dirname, '../../src/cli/index.ts');
const FIXTURES_DIR = path.join(__dirname, '../fixtures');
const TEMP_DIR = 'integration-test-files';

const run = (args: string): string =>
  execSync(`bun run ${CLI_PATH} ${args}`, { encoding: 'utf8', stdio: 'pipe' });

describe('CLI Integration', () => {
  afterEach(() => {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  it('should show help with --help', () => {
    const result = run('--help');
    expect(result).toContain('Usage:');
    expect(result).toContain('--help');
    expect(result).toContain('--version');
    expect(result).toContain('-o <output>');
  });

  it('should show help with -h', () => {
    const result = run('-h');
    expect(result).toContain('tqs - quick scripts for typescript');
  });

  it('should show version with --version', () => {
    const result = run('--version');
    expect(result.trim()).toContain('1.0.0');
  });

  it('should show help when no arguments provided', () => {
    const result = run('');
    expect(result).toContain('Usage:');
  });

  it('should fail for non-existent file', () => {
    expect(() => run('non-existent.tqs')).toThrow();
  });

  it('should reject unmarked file with helpful error', () => {
    const unmarked = path.join(FIXTURES_DIR, 'unmarked.ts');
    expect(() => run(unmarked)).toThrow('not marked for QuickJS execution');
  });

  it('should accept .tqs extension', () => {
    const fixture = path.join(FIXTURES_DIR, 'tqs-extension.tqs');
    try {
      run(fixture);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('not marked for QuickJS execution')) throw err;
    }
  });

  it('should accept @tqs-script comment', () => {
    const fixture = path.join(FIXTURES_DIR, 'tqs-comment.ts');
    try {
      run(fixture);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('not marked for QuickJS execution')) throw err;
    }
  });

  it('should accept file in scripts directory', () => {
    fs.mkdirSync(path.join(TEMP_DIR, 'scripts'), { recursive: true });
    const dirFixture = path.join(TEMP_DIR, 'scripts', 'detect-by-dir.ts');
    fs.writeFileSync(dirFixture, 'console.log("detect by dir");');

    try {
      run(dirFixture);
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('not marked for QuickJS execution')) throw err;
    }
  });

  it('should build a standalone executable with -o', () => {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const scriptPath = path.join(TEMP_DIR, 'build-me.tsq');
    const outputPath = path.join(TEMP_DIR, 'build-me');

    fs.writeFileSync(
      scriptPath,
      'import * as std from "std";\nstd.printf("standalone build works\\n");\n'
    );

    run(`${scriptPath} -o ${outputPath}`);

    const result = execSync(outputPath, { encoding: 'utf8', stdio: 'pipe' });
    expect(result).toContain('standalone build works');
  });
});
