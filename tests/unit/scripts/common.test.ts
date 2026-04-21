import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { createTempTracker, runBash, writeFile } from './helpers.js';

const COMMON_PATH = path.join(__dirname, '../../../scripts/lib/common.sh');
const STAGE_SCRIPT_PATH = path.join(__dirname, '../../../scripts/stage-quickjs.sh');
const REPO_ROOT = path.join(__dirname, '../../..');
const tempTracker = createTempTracker();

afterEach(() => {
  tempTracker.cleanupTempRoots();
});

describe('common.sh', () => {
  it('resolves repo_root and path_in_dir', () => {
    const output = runBash(
      'source "$COMMON_PATH"; printf "%s\\n%s\\n" "$(repo_root "$STAGE_SCRIPT_PATH")" "$(path_in_dir /tmp demo)"',
      { env: { ...process.env, COMMON_PATH, STAGE_SCRIPT_PATH } }
    );
    const [repoRoot, joinedPath] = output.trim().split('\n');

    expect(repoRoot).toBe(REPO_ROOT);
    expect(joinedPath).toBe('/tmp/demo');
  });

  it('creates and removes temporary directories', () => {
    const output = runBash('source "$COMMON_PATH"; tmp=$(make_temp_dir "common-test.XXXXXX"); printf "%s\\n" "$tmp"', {
      env: { ...process.env, COMMON_PATH },
    });
    const tempDir = output.trim();

    expect(fs.existsSync(tempDir)).toBe(true);

    runBash('source "$COMMON_PATH"; cleanup_dir "$TEMP_DIR"', {
      env: { ...process.env, COMMON_PATH, TEMP_DIR: tempDir },
    });

    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it('removes empty directories but preserves non-empty ones', () => {
    const rootDir = tempTracker.createTempRoot('tqs-common-');
    const emptyDir = path.join(rootDir, 'empty');
    const fullDir = path.join(rootDir, 'full');

    fs.mkdirSync(emptyDir, { recursive: true });
    writeFile(path.join(fullDir, 'file.txt'));

    runBash(
      'source "$COMMON_PATH"; remove_dir_if_empty "$EMPTY_DIR"; remove_dir_if_empty "$FULL_DIR"',
      { env: { ...process.env, COMMON_PATH, EMPTY_DIR: emptyDir, FULL_DIR: fullDir } }
    );

    expect(fs.existsSync(emptyDir)).toBe(false);
    expect(fs.existsSync(fullDir)).toBe(true);
  });
});
