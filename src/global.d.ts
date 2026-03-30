// Global QuickJS types - automatically included when using tqs CLI
// This file makes QuickJS environment available without imports

// QuickJS-Specific Modules (not available in Node.js)

// std module
interface QuickJSStd {
  exit(code: number): void;
  gc(): void;
  evalScript(source: string, filename?: string): unknown;
  loadScript(filename: string): unknown;
  printf(format: string, ...args: unknown[]): void;
  sprintf(format: string, ...args: unknown[]): string;
  in: {
    getline(): string | null;
  };
  out: {
    puts(str: string): void;
    printf(format: string, ...args: unknown[]): void;
    flush(): void;
  };
  err: {
    puts(str: string): void;
    printf(format: string, ...args: unknown[]): void;
    flush(): void;
  };
}

// os module
interface QuickJSOS {
  open(filename: string, flags: string, mode?: number): number;
  close(fd: number): number;
  read(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
  write(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
  seek(fd: number, offset: number, whence: number): number;
  getcwd(): string;
  chdir(path: string): number;
  mkdir(path: string, mode?: number): number;
  readdir(path: string): string[];
  realpath(path: string): string;
  unlink(path: string): number;
  rename(oldpath: string, newpath: string): number;
  stat(path: string): {
    size: number;
    mode: number;
    mtime: number;
    atime: number;
    ctime: number;
  };
  exec(args: string[], env?: Record<string, string>): number;
  waitpid(pid: number, options?: number): [number, number];
  kill(pid: number, signal: number): number;
  sleep(ms: number): void;
  platform: string;
}

// Module declarations
declare module 'std' {
  const std: QuickJSStd;
  export = std;
}

declare module 'os' {
  const os: QuickJSOS;
  export = os;
}

// Node.js modules are NOT available in QuickJS
declare module 'fs' {
  const _: 'Node.js fs module is not available in QuickJS. Use os module instead.';
  export = _;
}

declare module 'path' {
  const _: 'Node.js path module is not available in QuickJS. Use os module instead.';
  export = _;
}

declare module 'http' {
  const _: 'Node.js http module is not available in QuickJS. Use maybefetch() instead.';
  export = _;
}

declare module 'https' {
  const _: 'Node.js https module is not available in QuickJS. Use maybefetch() instead.';
  export = _;
}

declare module 'process' {
  const _: 'Node.js process module is not available in QuickJS. Use std module instead.';
  export = _;
}

declare module 'child_process' {
  const _: 'Node.js child_process module is not available in QuickJS. Use os.exec() instead.';
  export = _;
}

export {};

declare global {
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