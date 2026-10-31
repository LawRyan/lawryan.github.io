// Builds the creative-concept prototypes in concepts/<name>/ into dist/concepts/<name>/ (noindex, unlinked).
// A concept's main.js is bundled with esbuild (three.js and its addons are vendored); every other file is copied.
// Usage: node scripts/build-concepts.mjs [name]
import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

export async function buildConcepts(OUT = 'dist', only) {
  for (const d of ['fonts', 'lios-shots']) if (!existsSync(join(OUT, d))) cpSync(join('public', d), join(OUT, d), { recursive: true });
  const names = readdirSync('concepts').filter(n => statSync(join('concepts', n)).isDirectory() && (!only || n === only));
  for (const n of names) {
    const src = join('concepts', n), out = join(OUT, 'concepts', n);
    mkdirSync(out, { recursive: true });
    for (const f of readdirSync(src)) if (f !== 'main.js' && f !== 'render.ts' && !f.endsWith('.md')) cpSync(join(src, f), join(out, f), { recursive: true });
    if (existsSync(join(src, 'main.js'))) await esbuild.build({
      entryPoints: [join(src, 'main.js')], bundle: true, format: 'esm', minify: true, target: ['es2020', 'safari15'],
      outfile: join(out, 'main.js'), logLevel: 'warning',
      alias: { three: resolve('vendor/three/three.module.js'), 'three/addons': resolve('vendor/three/addons') },
    });
    // a concept may render content at build time (render.ts default export: placeholder → HTML)
    if (existsSync(join(src, 'render.ts'))) {
      const tmp = resolve(`.render-${n}.mjs`);
      await esbuild.build({ entryPoints: [join(src, 'render.ts')], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'warning' });
      const fill = (await import(pathToFileURL(tmp).href + '?t=' + Date.now())).default(); rmSync(tmp);
      let html = readFileSync(join(out, 'index.html'), 'utf8');
      for (const [k, v] of Object.entries(fill)) html = html.split(k).join(v);
      writeFileSync(join(out, 'index.html'), html);
    }
  }
  return names;
}
if (process.argv[1].endsWith('build-concepts.mjs')) console.log('built', await buildConcepts('dist', process.argv[2]));
