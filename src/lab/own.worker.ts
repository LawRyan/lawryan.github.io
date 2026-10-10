// Runs the own-file analysis off the main thread so large files never freeze the page.
import { analyse } from './own';
const ctx = self as unknown as { onmessage: ((e: MessageEvent<{ name: string; bytes: number; text: string }>) => void) | null; postMessage: (m: unknown) => void };
ctx.onmessage = e => {
  try { ctx.postMessage({ ok: true, a: analyse(e.data.name, e.data.bytes, e.data.text) }); }
  catch (err) { ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) }); }
};
