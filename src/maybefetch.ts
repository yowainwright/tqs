import type { FetchConfig } from './types.js';

export const defaultConfig: FetchConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2.0,
  timeoutMs: 10000,
};

export const fetch = (url: string, config: FetchConfig = defaultConfig): string | null => {
  return maybefetch(
    url,
    config.maxRetries,
    config.initialDelayMs,
    config.maxDelayMs,
    config.backoffFactor,
    config.timeoutMs
  );
};

export const fetchAsync = async (
  url: string,
  config: FetchConfig = defaultConfig
): Promise<string | null> => {
  return Promise.resolve(fetch(url, config));
};