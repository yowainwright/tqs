import { execFileSync, type ExecFileSyncOptionsWithStringEncoding } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const createTempTracker = (): {
  createTempRoot: (prefix: string) => string;
  cleanupTempRoots: () => void;
} => {
  const tempRoots: string[] = [];

  return {
    createTempRoot(prefix: string): string {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
      tempRoots.push(root);
      return root;
    },
    cleanupTempRoots(): void {
      for (const root of tempRoots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  };
};

export const writeFile = (filePath: string, contents = 'test'): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

export const writeExecutable = (filePath: string, contents: string): void => {
  writeFile(filePath, contents);
  fs.chmodSync(filePath, 0o755);
};

export const runBash = (
  command: string,
  options: Omit<ExecFileSyncOptionsWithStringEncoding, 'encoding'> = {}
): string =>
  execFileSync('/bin/bash', ['-lc', command], {
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });

export const runScript = (
  scriptPath: string,
  args: string[] = [],
  options: Omit<ExecFileSyncOptionsWithStringEncoding, 'encoding'> = {}
): string =>
  execFileSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });

export const initGitRepo = (repoDir: string, files: Record<string, string>): string => {
  fs.mkdirSync(repoDir, { recursive: true });

  // Strip git env vars so a parent git hook's GIT_DIR doesn't bleed into this
  // isolated repo and contaminate the main repo's index.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  const opts = { cwd: repoDir, env };

  runBash('git init -q', opts);
  runBash('git config user.email "tests@example.com"', opts);
  runBash('git config user.name "Test Runner"', opts);

  for (const [relativePath, contents] of Object.entries(files)) {
    writeFile(path.join(repoDir, relativePath), contents);
  }

  runBash('git add .', opts);
  runBash('git commit -q -m "test commit"', opts);
  return runBash('git rev-parse HEAD', opts).trim();
};
