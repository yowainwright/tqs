declare module 'qjs:std' {
  export function exit(code: number): void;
  export function gc(): void;
  export function evalScript(source: string, filename?: string): unknown;
  export function loadScript(filename: string): unknown;
  export function getenv(name: string): string | null;
  export function loadFile(filename: string): string | null;
  export function printf(format: string, ...args: unknown[]): void;
  export function sprintf(format: string, ...args: unknown[]): string;
  export const in_: {
    getline(): string | null;
  };
  export const out: {
    puts(str: string): void;
    printf(format: string, ...args: unknown[]): void;
    flush(): void;
  };
  export const err: {
    puts(str: string): void;
    printf(format: string, ...args: unknown[]): void;
    flush(): void;
  };
}

declare module 'qjs:os' {
  export function open(filename: string, flags: string, mode?: number): number;
  export function close(fd: number): number;
  export function read(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
  export function write(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
  export function seek(fd: number, offset: number, whence: number): number;
  export function getcwd(): string;
  export function chdir(path: string): number;
  export function mkdir(path: string, mode?: number): number;
  export function readdir(path: string): string[];
  export function realpath(path: string): string;
  export function unlink(path: string): number;
  export function rename(oldpath: string, newpath: string): number;
  export function stat(path: string): { size: number; mode: number; mtime: number; atime: number; ctime: number };
  export function exec(args: string[], options?: { block?: boolean; env?: Record<string, string> }): number;
  export function waitpid(pid: number, options?: number): [number, number];
  export function kill(pid: number, signal: number): number;
  export function sleep(ms: number): void;
  export const platform: string;
}

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
