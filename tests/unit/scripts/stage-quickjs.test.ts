import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { cleanupTempRoots, createTempRoot, initGitRepo, runScript, writeFile } from './helpers.js';

const SCRIPT_PATH = path.join(__dirname, '../../../scripts/stage-quickjs.sh');

const createStageFixture = (fileList: string[]): { rootDir: string; commit: string } => {
  const rootDir = createTempRoot('tqs-stage-');
  const repoDir = path.join(rootDir, 'quickjs-ng');
  const commit = initGitRepo(repoDir, {
    'quickjs.c': 'int quickjs = 1;\n',
    'nested/header.h': '#define QUICKJS 1\n',
  });

  writeFile(path.join(rootDir, 'scripts/quickjs-ng.commit'), `${commit}\n`);
  writeFile(path.join(rootDir, 'scripts/quickjs-ng.files'), `${fileList.join('\n')}\n`);

  return { rootDir, commit };
};

afterEach(() => {
  cleanupTempRoots();
});

describe('stage-quickjs.sh', () => {
  it('stages pinned files from a local checkout', () => {
    const { rootDir, commit } = createStageFixture(['quickjs.c', 'nested/header.h']);

    const output = runScript(SCRIPT_PATH, [rootDir]);

    expect(output).toContain('Staging QuickJS from local checkout');
    expect(output).toContain(`QuickJS staged at ${path.join(rootDir, 'deps/quickjs-ng')}`);
    expect(fs.readFileSync(path.join(rootDir, 'deps/quickjs-ng/quickjs.c'), 'utf8')).toContain('quickjs');
    expect(fs.readFileSync(path.join(rootDir, 'deps/quickjs-ng/nested/header.h'), 'utf8')).toContain(
      'QUICKJS'
    );
    expect(fs.readFileSync(path.join(rootDir, 'deps/quickjs-ng/UPSTREAM_COMMIT'), 'utf8').trim()).toBe(commit);
  });

  it('fails when a required file is missing from the snapshot', () => {
    const { rootDir } = createStageFixture(['quickjs.c', 'missing.h']);

    expect(() => runScript(SCRIPT_PATH, [rootDir])).toThrow("Missing required QuickJS file 'missing.h'");
  });
});
