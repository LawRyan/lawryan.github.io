import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
for (const name of ['analyst', 'own']) {
  const out = `.test-out/${name}.test.mjs`;
  await build({ entryPoints: [`src/lab/${name}.test.ts`], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
  await import(pathToFileURL(out).href + '?' + Date.now());
}
