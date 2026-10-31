import { chromium } from 'playwright';
import { serve } from '../serve.mjs';
const s = await serve(4302);
const b = await chromium.launch();
for (let run = 0; run < 4; run++) {
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: run % 2 ? { dir: '/tmp/cdbgvid' } : undefined });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://127.0.0.1:4302/concepts/c-os/?still');
await p.keyboard.press('Enter'); await p.waitForTimeout(2600);
await p.keyboard.press('Control+ArrowRight');
for (let i = 0; i < 6; i++) { await p.waitForTimeout(600); console.log(run, await p.evaluate(() => JSON.stringify({ p: __os.state.p.toFixed(3), v: __os.state.liosVisited, keys: [...__os.anims.keys()], raf: __os.raf(), hid: document.hidden }))); }
await ctx.close();
}
await b.close(); s.close();
