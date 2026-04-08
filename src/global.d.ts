export {};

declare global {
  const scriptArgs: string[];

  const console: {
    log(...args: unknown[]): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
  };

  const process: 'Node.js process global is not available in QuickJS. Use std module instead.';
  const __dirname: 'Node.js __dirname is not available in QuickJS. Use os.getcwd() instead.';
  const __filename: 'Node.js __filename is not available in QuickJS.';
  const Buffer: 'Node.js Buffer is not available in QuickJS. Use ArrayBuffer instead.';
  const require: 'Node.js require() is not available in QuickJS. Use import instead.';

  function maybefetch(
    url: string,
    maxRetries: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffFactor: number,
    timeoutMs: number
  ): string | null;
}
