import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/cli.ts', 'src/index.ts'],
    format: ['cjs'],
    target: 'node18',
    clean: true,
    sourcemap: true,
    dts: true,
    splitting: false,
    bundle: true,
    noExternal: [/(.*)/], // Bundle all dependencies to avoid ESM/CJS issues
    shims: true,
});
