import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
const out = '.test-out/engine.test.mjs';
await build({ entryPoints: ['src/lab/engine.test.ts'], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
await import(pathToFileURL(out).href);
