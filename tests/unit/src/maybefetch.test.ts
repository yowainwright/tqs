import { describe, it, expect } from 'bun:test';
import { fetch, fetchAsync, defaultConfig } from '../../../src/maybefetch.js';
import type { FetchConfig, NativeBinding } from '../../../src/types.js';

const createMockBinding = (returnValue: string | null): NativeBinding => ({
  createFetchConfig: () => ({}),
  maybeFetch: () => returnValue,
});

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

describe('fetch', () => {
  it('should return binding result with custom config', () => {
    const config: FetchConfig = {
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 15000,
      backoffFactor: 1.5,
      timeoutMs: 5000,
    };

    const result = fetch('https://example.com', config, createMockBinding('response'));
    expect(result).toBe('response');
  });

  it('should return null on failure', () => {
    const result = fetch('https://example.com', defaultConfig, createMockBinding(null));
    expect(result).toBeNull();
  });

  it('should throw without binding or global maybefetch', () => {
    expect(() => fetch('https://example.com')).toThrow('maybefetch is not available');
  });
});

describe('fetchAsync', () => {
  it('should resolve to fetch result', async () => {
    const result = await fetchAsync('https://example.com', defaultConfig, createMockBinding('async'));
    expect(result).toBe('async');
  });

  it('should resolve to null on failure', async () => {
    const result = await fetchAsync('https://example.com', defaultConfig, createMockBinding(null));
    expect(result).toBeNull();
  });
});
