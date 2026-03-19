import type { FetchConfig, NativeBinding } from './types.js';

export type { FetchConfig, NativeBinding } from './types.js';

export const defaultConfig: FetchConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2.0,
  timeoutMs: 10000,
};

const callBinding = (url: string, config: FetchConfig, binding: NativeBinding): string | null => {
  const nativeConfig = binding.createFetchConfig(
    config.maxRetries,
    config.initialDelayMs,
    config.maxDelayMs,
    config.backoffFactor,
    config.timeoutMs
  );
  return binding.maybeFetch(url, nativeConfig);
};

const callGlobal = (url: string, config: FetchConfig): string | null => {
  const global = globalThis as Record<string, unknown>;
  const maybefetchFn = global['maybefetch'] as
    | ((url: string, ...args: number[]) => string | null)
    | undefined;

  if (!maybefetchFn) {
    throw new Error('maybefetch is not available. Use a NativeBinding or run in QuickJS.');
  }

  return maybefetchFn(
    url,
    config.maxRetries,
    config.initialDelayMs,
    config.maxDelayMs,
    config.backoffFactor,
    config.timeoutMs
  );
};

export const fetch = (
  url: string,
  config: FetchConfig = defaultConfig,
  binding?: NativeBinding
): string | null =>
  binding ? callBinding(url, config, binding) : callGlobal(url, config);

export const fetchAsync = async (
  url: string,
  config: FetchConfig = defaultConfig,
  binding?: NativeBinding
): Promise<string | null> =>
  Promise.resolve(fetch(url, config, binding));
