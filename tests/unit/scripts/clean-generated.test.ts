import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { cleanupTempRoots, createTempRoot, runScript, writeFile } from './helpers.js';

const SCRIPT_PATH = path.join(__dirname, '../../../scripts/clean-generated.sh');

const runClean = (rootDir: string, target?: string): void => {
  const args = [SCRIPT_PATH, rootDir];
  if (target) args.push(target);
  runScript(SCRIPT_PATH, args.slice(1));
};

const assertMissing = (targetPath: string): void => {
  expect(fs.existsSync(targetPath)).toBe(false);
};

const assertPresent = (targetPath: string): void => {
  expect(fs.existsSync(targetPath)).toBe(true);
};

afterEach(() => {
  cleanupTempRoots();
});

describe('clean-generated.sh', () => {
  it('removes all generated outputs with the default target', () => {
    const rootDir = createTempRoot('tqs-clean-generated-');
    const quickjsDir = path.join(rootDir, 'deps/quickjs-ng');
    const qjscPath = path.join(rootDir, 'bin/qjsc');
    const distFile = path.join(rootDir, 'dist/index.js');

    writeFile(path.join(quickjsDir, 'quickjs.c'));
    writeFile(qjscPath);
    writeFile(distFile);

    runClean(rootDir);

    assertMissing(quickjsDir);
    assertMissing(path.join(rootDir, 'deps'));
    assertMissing(qjscPath);
    assertMissing(path.join(rootDir, 'bin'));
    assertMissing(path.join(rootDir, 'dist'));
  });

  it('removes only staged QuickJS sources for the quickjs target', () => {
    const rootDir = createTempRoot('tqs-clean-generated-');
    const quickjsDir = path.join(rootDir, 'deps/quickjs-ng');
    const qjscPath = path.join(rootDir, 'bin/qjsc');
    const distFile = path.join(rootDir, 'dist/index.js');

    writeFile(path.join(quickjsDir, 'quickjs.c'));
    writeFile(qjscPath);
    writeFile(distFile);

    runClean(rootDir, 'quickjs');

    assertMissing(quickjsDir);
    assertMissing(path.join(rootDir, 'deps'));
    assertPresent(qjscPath);
    assertPresent(distFile);
  });

  it('fails for an unknown target', () => {
    const rootDir = createTempRoot('tqs-clean-generated-');

    expect(() => runClean(rootDir, 'nope')).toThrow("Unknown clean target 'nope'");
  });
});
