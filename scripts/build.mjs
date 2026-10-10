// Build: bundles each page with esbuild, writes HTML with SEO metadata, copies /public.
// Output in dist/ is a plain static site that GitHub Pages serves as-is.
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const watch = process.argv.includes('--watch');
const OUT = 'dist';

const pages = [
  {
    entry: 'src/main-home.tsx', out: 'index.html', path: '/', og: 'home',
    title: 'Ryan Law — Capital Markets, Data & Intelligence',
    desc: 'Ryan Law, Vice President at RBC Capital Markets: reporting, data quality, analytics and automation. Creator of L//IOS, independent software that understands data and shows its working.',
  },
  {
    entry: 'src/main-lios.tsx', out: 'lios/index.html', path: '/lios/', og: 'lios',
    title: 'L//IOS — An Operating System for Insight',
    desc: 'L//IOS is an independent project by Ryan Law: L//IOS Analyst for data intelligence, L//IOS Markets for research, and L//IOS Health on Android. Real screenshots, demo data.',
  },
];

const ld = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Person', name: 'Ryan Law', url: 'https://lawryan.github.io/',
  jobTitle: 'Vice President, Client Intelligence', worksFor: { '@type': 'Organization', name: 'RBC Capital Markets' },
  alumniOf: 'Wilfrid Laurier University',
  sameAs: ['https://www.linkedin.com/in/ryan-law-92a629104/', 'https://github.com/lawryan'],
});

const options = {
  entryPoints: pages.map(p => p.entry),
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: join(OUT, 'assets'),
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
  assetNames: '[name]-[hash]',
  minify: !watch,
  sourcemap: watch,
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  metafile: true,
  external: ['/fonts/*', '/legacy-assets/*'],
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  logLevel: 'warning',
};

function writeHtml(meta, pre = {}) {
  const tpl = readFileSync('pages/template.html', 'utf8');
  const outs = Object.entries(meta.outputs);
  for (const p of pages) {
    const [js, info] = outs.find(([, o]) => o.entryPoint === p.entry);
    const css = info.cssBundle;
    const rel = f => '/' + f.replace(/^dist\//, '');
    const html = tpl
      .replaceAll('%TITLE%', p.title).replaceAll('%DESC%', p.desc).replaceAll('%PATH%', p.path).replaceAll('%OG%', p.og)
      .replace('%CSS%', rel(css)).replace('%JS%', rel(js)).replace('%LD%', ld)
      .replace('<div id="root"></div>', `<div id="root">${pre[p.og] ?? ''}</div>`);
    mkdirSync(dirname(join(OUT, p.out)), { recursive: true });
    writeFileSync(join(OUT, p.out), html);
  }
  // GitHub Pages serves 404.html for unknown paths; send people somewhere useful.
  writeFileSync(join(OUT, '404.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found — Ryan Law</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090c11;color:#e9eef5;font-family:system-ui,sans-serif;text-align:center;padding:0 20px}a{color:#6fd3f2}</style><div><p style="font-family:ui-monospace,monospace;color:#6c7789;letter-spacing:.1em">404</p><h1 style="font-weight:500">That page isn’t here.</h1><p><a href="/">Go to the homepage</a> · <a href="/lios/">L//IOS</a></p></div>`);
  writeFileSync(join(OUT, '.nojekyll'), '');
}

// Pre-render each page to static HTML so text shows before any JavaScript runs; React then hydrates it.
async function prerender() {
  const file = resolve(OUT, '_ssr.mjs');
  await esbuild.build({
    stdin: {
      contents: `import { renderToString } from 'react-dom/server';
        import { jsx } from 'react/jsx-runtime';
        import Home from './src/home/Home';
        import LiosPage from './src/lios/LiosPage';
        export const home = () => renderToString(jsx(Home, {}));
        export const lios = () => renderToString(jsx(LiosPage, {}));`,
      resolveDir: '.', loader: 'tsx',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: file, jsx: 'automatic',
    loader: { '.css': 'empty' }, logLevel: 'warning',
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const m = await import(pathToFileURL(file).href);
  const out = { home: m.home(), lios: m.lios() };
  rmSync(file);
  return out;
}

if (/REVIEW_MODE = true/.test(readFileSync('src/content.ts', 'utf8'))) console.warn('⚠  REVIEW_MODE is on: approval markers are visible. Set it to false in src/content.ts before publishing.');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });

if (watch) {
  const ctx = await esbuild.context({ ...options, plugins: [{ name: 'html', setup(b) { b.onEnd(r => r.metafile && writeHtml(r.metafile)); } }] });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: OUT, port: 5173 });
  console.log(`Dev server: http://localhost:${port}`);
} else {
  const r = await esbuild.build(options);
  writeHtml(r.metafile, await prerender());
  const size = Object.entries(r.metafile.outputs).filter(([f]) => !f.endsWith('.map')).map(([f, o]) => `${f}  ${(o.bytes / 1024).toFixed(1)} kB`);
  console.log(size.join('\n'));
  if (!existsSync(join(OUT, 'starter/index.html'))) throw new Error('legacy apps missing');
}
