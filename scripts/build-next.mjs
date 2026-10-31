// Builds the experimental redesign at /next/ (noindex, not linked from the live site).
// three.js is vendored in vendor/three (the npm registry isn't reachable from the build machine).
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function buildNext(OUT = 'dist', { minify = true } = {}) {
  const r = await esbuild.build({
    entryPoints: { 'next-main': 'src/next/main.ts' },
    bundle: true, format: 'esm', minify, target: ['es2020', 'safari15'],
    outdir: join(OUT, 'assets'), entryNames: '[name]-[hash]', metafile: true, logLevel: 'warning',
    alias: { three: resolve('vendor/three/three.module.js') },
    external: ['/fonts/*'],
  });
  const outs = Object.entries(r.metafile.outputs);
  const [js, info] = outs.find(([, o]) => o.entryPoint === 'src/next/main.ts');
  const rel = f => '/' + f.replace(/^dist\//, '');
  const html = readFileSync('pages/next.html', 'utf8').replace('%CSS%', rel(info.cssBundle)).replace('%JS%', rel(js));
  mkdirSync(join(OUT, 'next'), { recursive: true });
  writeFileSync(join(OUT, 'next/index.html'), html);
  return outs.filter(([f]) => f.includes('next-main')).map(([f, o]) => `${f}  ${(o.bytes / 1024).toFixed(1)} kB`);
}
