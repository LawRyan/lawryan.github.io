// Builds the experimental redesign at /next/ (noindex, not linked from the live site).
// three.js is vendored in vendor/three (the npm registry isn't reachable from the build machine).
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
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
  // content-driven markup (career, L//IOS showcase) is rendered at build time from src/content.ts
  const tmp = resolve('.next-static.mjs');
  await esbuild.build({ entryPoints: ['src/next/static.ts'], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'warning' });
  const S = await import(pathToFileURL(tmp).href + '?t=' + Date.now()); rmSync(tmp);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fill = { '%CSS%': rel(info.cssBundle), '%JS%': rel(js), '%CAREER%': S.career(), '%SHOWCASE%': S.showcase(),
    '%STATEMENT%': esc(S.values.statement), '%DISCLAIMER%': esc(S.values.disclaimer), '%EMAIL%': S.values.email, '%LINKEDIN%': S.values.linkedin };
  let html = readFileSync('pages/next.html', 'utf8');
  for (const [k, v] of Object.entries(fill)) html = html.split(k).join(v);
  mkdirSync(join(OUT, 'next'), { recursive: true });
  writeFileSync(join(OUT, 'next/index.html'), html);
  return outs.filter(([f]) => f.includes('next-main')).map(([f, o]) => `${f}  ${(o.bytes / 1024).toFixed(1)} kB`);
}
