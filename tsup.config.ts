import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts', 'src/quickjs.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: false,
  minify: true,
  target: 'es2020',
  outDir: 'dist',
  platform: 'neutral',
  noExternal: [/.*/],
});