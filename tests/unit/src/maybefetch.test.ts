import { describe, it, expect } from 'bun:test';
import { maybeFetch, defaultConfig } from '../../../src/maybefetch.js';
import type { FetchConfig } from '../../../src/types.js';

describe('defaultConfig', () => {
  it('should have expected values', () => {
    expect(defaultConfig).toEqual({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffFactor: 2.0,
      timeoutMs: 10000,
    });
  });
});

describe('maybeFetch', () => {
  it('should throw without global maybefetch', () => {
    expect(() => maybeFetch('https://example.com')).toThrow('maybefetch is not available');
  });

  it('should throw with custom config when global unavailable', () => {
    const config: FetchConfig = {
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 15000,
      backoffFactor: 1.5,
      timeoutMs: 5000,
    };
    expect(() => maybeFetch('https://example.com', config)).toThrow('maybefetch is not available');
  });
});
