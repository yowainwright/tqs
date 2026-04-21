import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { createTempTracker, runScript, writeExecutable } from './helpers.js';

const SCRIPT_PATH = path.join(__dirname, '../../../scripts/smoke-packed-artifact.sh');
const tempTracker = createTempTracker();

const createSmokeFixture = (): {
  rootDir: string;
  fakeBinDir: string;
  fakeNodePath: string;
  fakeNpmCliPath: string;
} => {
  const rootDir = tempTracker.createTempRoot('tqs-smoke-script-');
  const scriptsDir = path.join(rootDir, 'scripts');
  const fakeBinDir = path.join(rootDir, 'fake-bin');
  const fakeNodePath = path.join(fakeBinDir, 'node');
  const fakeNpmCliPath = path.join(rootDir, 'fake-npm-cli.sh');

  writeExecutable(
    path.join(scriptsDir, 'stage-quickjs.sh'),
    `#!/bin/bash
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root_dir/deps/quickjs-ng"
printf 'quickjs\\n' > "$root_dir/deps/quickjs-ng/quickjs.c"
printf 'stage\\n' > "$root_dir/.stage-ran"
`
  );

  writeExecutable(
    path.join(rootDir, 'node_modules/.bin/tsup'),
    `#!/bin/bash
set -euo pipefail
mkdir -p dist
printf 'dist\\n' > dist/index.js
printf 'tsup\\n' > .tsup-ran
`
  );

  writeExecutable(
    fakeNodePath,
    `#!/bin/bash
set -euo pipefail
script_path="$1"
shift
exec bash "$script_path" "$@"
`
  );

  writeExecutable(
    fakeNpmCliPath,
    `#!/bin/bash
set -euo pipefail
command_name="$1"
shift
if [ "$command_name" != "pack" ]; then
  echo "unexpected command: $command_name" >&2
  exit 1
fi
pack_root="$(mktemp -d)"
mkdir -p "$pack_root/package/dist/cli"
cat > "$pack_root/package/dist/cli/index.js" <<'EOF'
#!/bin/bash
set -euo pipefail
if [ "\${1:-}" = "--help" ]; then
  printf 'Usage:\\n'
  exit 0
fi
output_path="\${3:?}"
cat > "$output_path" <<'OUT'
#!/bin/bash
printf 'packed artifact works\\n'
OUT
chmod +x "$output_path"
EOF
chmod +x "$pack_root/package/dist/cli/index.js"
tarball_path="$PWD/fake-package.tgz"
tar -czf "$tarball_path" -C "$pack_root" package
printf 'fake-package.tgz\\n'
`
  );

  return { rootDir, fakeBinDir, fakeNodePath, fakeNpmCliPath };
};

afterEach(() => {
  tempTracker.cleanupTempRoots();
});

describe('smoke-packed-artifact.sh', () => {
  it('runs the smoke flow and cleans generated repo artifacts', () => {
    const { rootDir, fakeBinDir, fakeNodePath, fakeNpmCliPath } = createSmokeFixture();

    const output = runScript(SCRIPT_PATH, [rootDir], {
      env: {
        ...process.env,
        PATH: `${fakeBinDir}:${process.env.PATH}`,
        NODE_BIN: fakeNodePath,
        NPM_CLI_PATH: fakeNpmCliPath,
      },
    });

    expect(output).toContain('Packed artifact smoke test passed.');
    expect(fs.readFileSync(path.join(rootDir, '.stage-ran'), 'utf8')).toContain('stage');
    expect(fs.readFileSync(path.join(rootDir, '.tsup-ran'), 'utf8')).toContain('tsup');
    expect(fs.existsSync(path.join(rootDir, 'dist'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'deps/quickjs-ng'))).toBe(false);
    expect(fs.existsSync(path.join(rootDir, 'fake-package.tgz'))).toBe(false);
  });
});
