import type { FetchConfig } from "./types.js";

export type { FetchConfig } from "./types.js";

export const defaultConfig: FetchConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2.0,
  timeoutMs: 10000,
};

const callGlobal = (url: string, config: FetchConfig): string | null => {
  const global = globalThis as Record<string, unknown>;
  const maybefetchFn = global["maybefetch"] as
    | ((url: string, ...args: number[]) => string | null)
    | undefined;

  if (!maybefetchFn) {
    throw new Error("maybefetch is not available. Run in a compiled QuickJS binary.");
  }

  return maybefetchFn(
    url,
    config.maxRetries,
    config.initialDelayMs,
    config.maxDelayMs,
    config.backoffFactor,
    config.timeoutMs,
  );
};

export const maybeFetch = (url: string, config: FetchConfig = defaultConfig): string | null =>
  callGlobal(url, config);
