export {};

declare global {
  const scriptArgs: string[];

  interface Console {
    log(...args: unknown[]): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
  }

  var console: Console;

  function maybefetch(
    url: string,
    maxRetries: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffFactor: number,
    timeoutMs: number,
    headers?: readonly string[],
  ): string | null;
}
