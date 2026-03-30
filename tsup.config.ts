import { defineConfig } from 'tsup';
import pkg from './package.json';

const shared = {
  format: ['esm'] as const,
  clean: false,
  sourcemap: false,
  minify: true,
  target: 'es2020' as const,
  outDir: 'dist',
  platform: 'neutral' as const,
  noExternal: [/.*/],
  esbuildOptions(options: { external?: string[] }) {
    options.external = ['qjs:std', 'qjs:os'];
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
};

export default defineConfig([
  {
    ...shared,
    entry: ['src/index.ts', 'src/quickjs.ts'],
    dts: true,
    clean: true,
  },
  {
    ...shared,
    entry: ['src/cli/index.ts'],
    dts: false,
  },
]);
