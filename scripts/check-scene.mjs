/**
 * Runtime check for the 3D character layer.
 *
 * The avatar shader can only be validated in a real browser: TSL compiles to
 * WGSL at runtime, so a broken node graph passes `tsc` and then invalidates the
 * render pipeline. This script loads the dev server, collects console errors,
 * and saves a screenshot of the office.
 *
 * Requires the dev server (npm run dev) and a Chromium-based browser.
 * Run with: npm run check:scene
 */

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.env.CHECK_URL || 'http://127.0.0.1:3000/';
const SHOT_DIR = 'scripts/.scene-shots';
mkdirSync(SHOT_DIR, { recursive: true });

// Must live outside the repo: Vite watches the project tree, and the browser's
// constant profile writes would trigger an endless HMR reload loop.
const PROFILE_DIR = join(tmpdir(), 'ikki-scene-check-profile');

// Headed, on the real GPU. Headless swiftshader exposes no WebGPU adapter, and
// the WebGL2 fallback cannot run this scene's storage buffers.
const browser = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: process.env.CHECK_BROWSER || 'msedge',
  headless: false,
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
  args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-gpu'],
});

const page = await browser.newPage();

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
// The scene builds asynchronously: GLB load, animation baking, shader compile.
await page.waitForTimeout(18000);

const canvases = await page.locator('canvas').count();

const expand = page.locator('button[title*="xpand"], button[aria-label*="xpand"]').first();
if (await expand.count()) {
  await expand.click().catch(() => {});
  await page.waitForTimeout(2500);
}

const box = await page.locator('canvas').first().boundingBox();
if (box) {
  await page.screenshot({ path: join(SHOT_DIR, 'office.png'), clip: box });
}

const shaderErrors = errors.filter((e) => /shader|pipeline|wgsl|vertex buffer|THREE\./i.test(e));

console.log(`canvas        : ${canvases}`);
console.log(`xatolar       : ${errors.length}`);
console.log(`shader xatosi : ${shaderErrors.length}`);
errors.slice(0, 15).forEach((e) => console.log('  ✗ ' + e.slice(0, 300)));
console.log(`\nskrinshot: ${join(SHOT_DIR, 'office.png')}`);

await browser.close();

if (canvases === 0) {
  console.error('\nXATO: canvas topilmadi — sahna yuklanmadi.');
  process.exit(1);
}
process.exit(shaderErrors.length > 0 ? 1 : 0);
