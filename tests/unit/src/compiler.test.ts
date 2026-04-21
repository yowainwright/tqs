import { describe, it, expect } from 'bun:test';
import { isTqsScript } from '../../../src/marker.js';

describe('isTqsScript', () => {
  it('should return true for file with @tqs-script marker', () => {
    expect(isTqsScript('// @tqs-script\nimport * as std from "qjs:std";')).toBe(true);
  });

  it('should return false for file without marker', () => {
    expect(isTqsScript('console.log("hello")')).toBe(false);
  });

  it('should detect marker after leading comment lines', () => {
    expect(isTqsScript('// some comment\n// @tqs-script\nconst x = 1;')).toBe(true);
  });

  it('should not detect marker beyond first 500 chars', () => {
    const padding = 'x'.repeat(501);
    expect(isTqsScript(`${padding}// @tqs-script`)).toBe(false);
  });

  it('should return false for empty content', () => {
    expect(isTqsScript('')).toBe(false);
  });
});
