import { build } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../extension/dist/', import.meta.url);
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
for (const [entry, outfile] of [['background', 'background.js'], ['dashboardBridge', 'dashboardBridge.js'], ['musicContent', 'musicContent.js'], ['offscreen', 'offscreen.js']]) {
  await build({ entryPoints: [`extension/src/${entry}.ts`], outfile: fileURLToPath(new URL(outfile, out)), bundle: true, format: 'iife', target: 'chrome116' });
}
await cp('extension/manifest.json', new URL('manifest.json', out)); await writeFile(new URL('offscreen.html', out), '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="offscreen.js"></script></body></html>');
console.log('Built unpacked extension at extension/dist');
