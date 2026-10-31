import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [out, w, h, tag] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const srv = spawn('node', ['scripts/serve.mjs', '4197'], { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 900));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: w, height: h }, recordVideo: { dir: out, size: { width: w, height: h } } });
const p = await ctx.newPage();
await p.goto('http://localhost:4197/next/'); await p.waitForTimeout(4500);
// sweep the lens across the field
for (let i = 0; i <= 40; i++) { await p.mouse.move(w * (0.35 + 0.4 * i / 40), h * (0.35 + 0.15 * Math.sin(i / 6))); await p.waitForTimeout(50); }
await p.waitForTimeout(800);
const total = await p.evaluate(() => document.querySelector('.coda').offsetTop);
for (let y = 0; y <= total; y += 18) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(16); }
await p.waitForTimeout(1500);
const fps = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('fps in headless software GL:', fps);
await ctx.close(); await b.close(); srv.kill();
