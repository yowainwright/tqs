import { describe, it, expect } from 'bun:test';
import { fetch, fetchAsync, defaultConfig } from '../../../src/maybefetch.js';
import type { FetchConfig, NativeBinding } from '../../../src/maybefetch.js';

describe('maybefetch', () => {
  const createMockBinding = (returnValue: string | null): NativeBinding => ({
    createFetchConfig: () => ({}),
    maybeFetch: () => returnValue
  });

  describe('defaultConfig', () => {
    it('should have expected default values', () => {
      expect(defaultConfig.maxRetries).toBe(3);
      expect(defaultConfig.initialDelayMs).toBe(1000);
      expect(defaultConfig.maxDelayMs).toBe(30000);
      expect(defaultConfig.backoffFactor).toBe(2.0);
      expect(defaultConfig.timeoutMs).toBe(10000);
    });
  });

  describe('fetch', () => {
    it('should call maybefetch with correct parameters', () => {
      const mockBinding = createMockBinding('test response');
      const config: FetchConfig = {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 15000,
        backoffFactor: 1.5,
        timeoutMs: 5000
      };

      const result = fetch('https://example.com', config, mockBinding);
      expect(result).toBe('test response');
    });

    it('should use default config when none provided', () => {
      const mockBinding = createMockBinding('default response');
      const result = fetch('https://example.com', defaultConfig, mockBinding);
      expect(result).toBe('default response');
    });

    it('should return null on failure', () => {
      const mockBinding = createMockBinding(null);
      const result = fetch('https://example.com', defaultConfig, mockBinding);
      expect(result).toBeNull();
    });
  });

  describe('fetchAsync', () => {
    it('should return a promise that resolves to fetch result', async () => {
      const mockBinding = createMockBinding('async response');
      const result = await fetchAsync('https://example.com', defaultConfig, mockBinding);
      expect(result).toBe('async response');
    });

    it('should handle null results in async mode', async () => {
      const mockBinding = createMockBinding(null);
      const result = await fetchAsync('https://example.com', defaultConfig, mockBinding);
      expect(result).toBeNull();
    });
  });
});