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

  it('should pass headers to global maybefetch', () => {
    const calls: unknown[][] = [];
    const global = globalThis as unknown as Record<string, unknown>;
    const original = global.maybefetch;
    global.maybefetch = (...args: unknown[]) => {
      calls.push(args);
      return 'ok';
    };

    const config: FetchConfig = {
      ...defaultConfig,
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer token',
      },
    };

    try {
      expect(maybeFetch('https://example.com', config)).toBe('ok');
      expect(calls[0]).toEqual([
        'https://example.com',
        3,
        1000,
        30000,
        2,
        10000,
        ['Accept: application/json', 'Authorization: Bearer token'],
      ]);
    } finally {
      if (original === undefined) {
        delete global.maybefetch;
      } else {
        global.maybefetch = original;
      }
    }
  });
});
