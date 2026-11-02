// node concepts/v6-hero/data.test.mjs — checks the numbers the hero quotes are what the data says
import { build, norm } from './data.js';
import assert from 'node:assert/strict';
const d = build();
assert.equal(d.N, 1400);
assert.ok(d.ACC > .97, 'rule sorts unseen customers well: ' + d.ACC);
assert.ok(d.BEST1 < d.ACC - .1, 'no single column does as well: ' + d.BEST1);
assert.ok(Math.abs(Math.abs(d.D[0] * d.U[0] + d.D[1] * d.U[1] + d.D[2] * d.U[2]) - 1) < .05, 'k-means direction matches the planted one');
assert.ok(d.sepAlong(d.U) > 10 * d.sepAlong(norm([0, 1, 0])), 'separation depends on the angle');
assert.equal(d.SEG.reduce((s, g) => s + g.n, 0), 1400);
console.log('ok', { acc: d.ACC, best1: d.BEST1, best1col: d.BEST1C, sep: d.SEP.toFixed(1), iters: d.H.length, D: d.D.map(v => v.toFixed(2)), segs: d.SEG.map(s => [s.n, s.desc]) });
