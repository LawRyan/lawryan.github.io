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

const person = {
  '@type': 'Person', '@id': 'https://lawryan.github.io/#ryan', name: 'Ryan Law', url: 'https://lawryan.github.io/',
  image: 'https://lawryan.github.io/og-home.png',
  jobTitle: 'Vice President, Client Intelligence', worksFor: { '@type': 'Organization', name: 'RBC Capital Markets' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'Wilfrid Laurier University' },
  knowsAbout: ['Capital Markets', 'Client intelligence', 'Business intelligence', 'Data quality', 'Tableau', 'Python', 'SQL', 'Automation', 'Applied AI'],
  sameAs: ['https://www.linkedin.com/in/ryan-law-92a629104/', 'https://github.com/lawryan'],
};
const ldFor = og => JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': og === 'lios'
    ? [person, { '@type': 'CreativeWork', name: 'L//IOS', alternateName: 'LIOS', url: 'https://lawryan.github.io/lios/', description: 'An independent project by Ryan Law: L//IOS Analyst for data intelligence, L//IOS Markets for research, and L//IOS Health on Android.', author: { '@id': 'https://lawryan.github.io/#ryan' }, image: 'https://lawryan.github.io/og-lios.png' }]
    : [person, { '@type': 'WebSite', name: 'Ryan Law', url: 'https://lawryan.github.io/', author: { '@id': 'https://lawryan.github.io/#ryan' } }],
});

// The own-file analyser runs in a Web Worker; bundle it separately and hand its URL to the app.
async function buildWorker() {
  const w = await esbuild.build({
    entryPoints: ['src/lab/own.worker.ts'], bundle: true, format: 'iife', minify: !watch, target: ['es2020', 'safari15'],
    outdir: join(OUT, 'assets'), entryNames: 'own-worker-[hash]', metafile: true, logLevel: 'warning',
  });
  return '/' + Object.keys(w.metafile.outputs).find(f => f.endsWith('.js')).replace(/^dist\//, '');
}

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
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'), __OWN_WORKER__: '""' },
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
      .replace('%CSS%', rel(css)).replace('%JS%', rel(js)).replace('%LD%', () => ldFor(p.og))
      .replace('<div id="root"></div>', () => `<div id="root">${pre[p.og] ?? ''}</div>`);
    mkdirSync(dirname(join(OUT, p.out)), { recursive: true });
    writeFileSync(join(OUT, p.out), html);
  }
  // GitHub Pages serves 404.html for unknown paths; send people somewhere useful.
  writeFileSync(join(OUT, '404.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Not found · Ryan Law</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>@font-face{font-family:IS;src:url(/fonts/InstrumentSans-var.woff2) format('woff2');font-weight:400 700;font-display:swap}@font-face{font-family:GM;src:url(/fonts/GeistMono-700.woff) format('woff');font-weight:700;font-display:swap}
html,body{margin:0;min-height:100%;background:#090c11;color:#e9eef5;font-family:IS,system-ui,sans-serif}body{min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:radial-gradient(600px 420px at 15% 10%,rgba(111,211,242,.14),transparent 70%),radial-gradient(640px 480px at 90% 85%,rgba(183,168,255,.11),transparent 70%),#090c11}
main{max-width:36rem}.k{font-family:GM,ui-monospace,monospace;font-size:13px;letter-spacing:.14em;color:#6fd3f2}h1{font-weight:600;font-size:clamp(2rem,6vw,3.2rem);letter-spacing:-.03em;line-height:1.05;margin:14px 0 12px}p{color:#a4afbf;font-size:1.05rem;line-height:1.6;margin:0 0 26px}
nav{display:flex;flex-wrap:wrap;gap:10px}a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:#e9eef5;text-decoration:none}a:first-child{background:#e9eef5;color:#090c11;border-color:#e9eef5}a:focus-visible{outline:2px solid #6fd3f2;outline-offset:3px}.w{font-family:GM,ui-monospace,monospace;font-weight:700}.w b{color:#6fd3f2}</style>
<main><div class="k">404 · OUTLIER DETECTED</div><h1>That page isn’t in the data.</h1><p>The link may be old or mistyped. Everything that’s here is one click away.</p><nav><a href="/">Ryan Law · home</a><a href="/lios/"><span class="w">L<b>//</b>IOS</span></a><a href="/#lab">Intelligence Lab</a><a href="/#contact">Contact</a></nav></main></html>`);
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
    define: { 'process.env.NODE_ENV': '"production"', __OWN_WORKER__: '""' },
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
options.define.__OWN_WORKER__ = JSON.stringify(await buildWorker());

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
