import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { createTempTracker, runBash, runScript } from './helpers.js';

const SCRIPT_PATH = path.join(__dirname, '../../../scripts/setup.sh');
const tempTracker = createTempTracker();

const createSetupRepo = (): string => {
  const rootDir = tempTracker.createTempRoot('tqs-setup-');
  runBash('git init -q', { cwd: rootDir });
  return rootDir;
};

const isExecutable = (filePath: string): boolean => (fs.statSync(filePath).mode & 0o111) !== 0;

afterEach(() => {
  tempTracker.cleanupTempRoots();
});

describe('setup.sh', () => {
  it('installs git hooks into .git/hooks', () => {
    const rootDir = createSetupRepo();

    const output = runScript(SCRIPT_PATH, [rootDir]);
    const preCommitPath = path.join(rootDir, '.git/hooks/pre-commit');
    const postMergePath = path.join(rootDir, '.git/hooks/post-merge');

    expect(output).toContain('pre-commit hook installed');
    expect(output).toContain('post-merge hook installed');
    expect(output).toContain('core.hooksPath reset');
    expect(fs.existsSync(preCommitPath)).toBe(true);
    expect(fs.existsSync(postMergePath)).toBe(true);
    expect(isExecutable(preCommitPath)).toBe(true);
    expect(isExecutable(postMergePath)).toBe(true);
    expect(fs.readFileSync(preCommitPath, 'utf8')).toContain('bun test tests/unit');
    expect(fs.readFileSync(postMergePath, 'utf8')).toContain('bash scripts/setup.sh');
  });

  it('clears a legacy core.hooksPath override and removes .githooks', () => {
    const rootDir = createSetupRepo();
    const legacyDir = path.join(rootDir, '.githooks');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'pre-commit'), 'legacy');
    runBash('git config --local core.hooksPath .githooks', { cwd: rootDir });

    runScript(SCRIPT_PATH, [rootDir]);

    expect(() => runBash('git config --local --get core.hooksPath', { cwd: rootDir })).toThrow();
    expect(fs.existsSync(legacyDir)).toBe(false);
  });
});
