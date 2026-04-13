export interface CliOptions {
  readonly help?: boolean | undefined;
  readonly version?: boolean | undefined;
}

export interface ParsedArgs extends CliOptions {
  readonly scriptFile?: string | undefined;
}

export interface FetchConfig {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffFactor: number;
  readonly timeoutMs: number;
}

export interface Logger {
  info(message: string): void;
  error(message: string): void;
  success(message: string): void;
  step(message: string): void;
}

export interface QuickJSStd {
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

export interface QuickJSOS {
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
  exec(args: string[], options?: { block?: boolean; env?: Record<string, string> }): number;
  waitpid(pid: number, options?: number): [number, number];
  kill(pid: number, signal: number): number;
  sleep(ms: number): void;
  platform: string;
}
