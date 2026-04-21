import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { createTempTracker, runScript, writeExecutable, writeFile } from './helpers.js';

const SCRIPT_PATH = path.join(__dirname, '../../../scripts/build-quickjs.sh');
const tempTracker = createTempTracker();

const createBuildFixture = (): {
  rootDir: string;
  depsDir: string;
  outputPath: string;
  ccLogPath: string;
  fakeCcPath: string;
} => {
  const rootDir = tempTracker.createTempRoot('tqs-build-');
  const depsDir = path.join(rootDir, 'deps/quickjs-ng');
  const outputPath = path.join(rootDir, 'bin/qjsc');
  const ccLogPath = path.join(rootDir, 'fake-cc.log');
  const fakeCcPath = path.join(rootDir, 'fake-cc.sh');

  for (const file of ['qjsc.c', 'quickjs.c', 'quickjs-libc.c', 'libregexp.c', 'libunicode.c', 'dtoa.c']) {
    writeFile(path.join(depsDir, file), `${file}\n`);
  }

  writeExecutable(
    fakeCcPath,
    `#!/bin/bash
set -euo pipefail
printf '%s\n' "$@" > "$FAKE_CC_LOG"
output_path=""
previous=""
for arg in "$@"; do
  if [ "$previous" = "-o" ]; then
    output_path="$arg"
    break
  fi
  previous="$arg"
done
touch "$output_path"
`
  );

  return { rootDir, depsDir, outputPath, ccLogPath, fakeCcPath };
};

afterEach(() => {
  tempTracker.cleanupTempRoots();
});

describe('build-quickjs.sh', () => {
  it('builds qjsc with the configured compiler and version', () => {
    const { rootDir, outputPath, ccLogPath, fakeCcPath } = createBuildFixture();

    const output = runScript(SCRIPT_PATH, [rootDir], {
      env: { ...process.env, CC_BIN: fakeCcPath, VERSION: 'test-version', FAKE_CC_LOG: ccLogPath },
    });

    expect(output).toContain('Building QuickJS compiler from staged sources...');
    expect(output).toContain(`Built ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);

    const ccArgs = fs.readFileSync(ccLogPath, 'utf8');
    expect(ccArgs).toContain('-DCONFIG_VERSION="test-version"');
    expect(ccArgs).toContain('qjsc.c');
    expect(ccArgs).toContain('quickjs.c');
    expect(ccArgs).toContain('-lpthread');
  });

  it('fails when staged sources are missing', () => {
    const rootDir = tempTracker.createTempRoot('tqs-build-');

    expect(() => runScript(SCRIPT_PATH, [rootDir])).toThrow('Staged QuickJS sources not found');
  });
});
