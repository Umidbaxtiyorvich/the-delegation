/**
 * Runtime check for the 2D portrait layer.
 *
 * `check:scene` covers the 3D office; this one covers the React side — the
 * portraits on the flow graph and the appearance editor in the agent panel.
 * Worth checking in a browser because a malformed SVG path renders as nothing
 * at all rather than throwing.
 *
 * Requires the dev server (npm run dev).
 * Run with: npm run check:portraits
 */

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.env.CHECK_URL || 'http://127.0.0.1:3000/';
const SHOT_DIR = 'scripts/.scene-shots';
mkdirSync(SHOT_DIR, { recursive: true });

const browser = await chromium.launchPersistentContext(join(tmpdir(), 'ikki-portrait-check'), {
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

const results = [];
const check = (label, ok, detail = '') => {
  results.push({ label, ok, detail });
  console.log(`  ${ok ? 'ok  ' : 'XATO'}  ${label}${detail ? ' — ' + detail : ''}`);
};

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(12000);

/** Portraits identify themselves through the aria-label the component sets. */
const portraits = page.locator('svg[aria-label$="avatari"]');

console.log('\n1. Grafikdagi portretlar');
let onGraph = await portraits.count();

// The graph may sit behind a tab depending on the current view.
if (onGraph === 0) {
  for (const name of ['Jamoa', 'Team', 'Configurator', 'Sozlamalar']) {
    const tab = page.locator(`button:has-text("${name}")`).first();
    if ((await tab.count()) > 0) {
      await tab.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
      onGraph = await portraits.count();
      if (onGraph > 0) break;
    }
  }
}

check("portretlar render bo'ldi", onGraph > 0, `${onGraph} ta`);

// Every portrait must actually paint geometry, not render an empty <svg>.
const emptyPortraits = await portraits.evaluateAll(
  (nodes) => nodes.filter((n) => n.querySelectorAll('path, circle, ellipse').length < 5).length
);
check('har bir portret geometriya chizadi', emptyPortraits === 0, `bo'sh: ${emptyPortraits}`);

// Distinct agents must not collapse to identical drawings.
const signatures = await portraits.evaluateAll((nodes) =>
  nodes.map((n) => {
    const fills = [...n.querySelectorAll('[fill]')].map((el) => el.getAttribute('fill')).join('|');
    const paths = [...n.querySelectorAll('path')].map((el) => el.getAttribute('d')).join('|');
    return (fills + paths).length + ':' + fills.slice(0, 400);
  })
);
const unique = new Set(signatures).size;
check(
  'portretlar bir-biridan farq qiladi',
  onGraph === 0 || unique >= Math.min(onGraph, 3),
  `${unique}/${signatures.length} noyob`
);

await page.screenshot({ path: join(SHOT_DIR, 'portraits-graph.png') });

console.log("\n2. Tashqi ko'rinish tahrirlagichi");

// The agent panel opens read-only; the appearance controls only appear once the
// selected team is switched into edit mode from its card.
const editTeam = page.locator('button:has-text("Jamoani tahrirlash")').first();
if ((await editTeam.count()) > 0) {
  await editTeam.click({ force: true, timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

// Open an agent panel by clicking a node on the flow graph.
const nodes = page.locator('.react-flow__node-agent');
const nodeCount = await nodes.count();
if (nodeCount > 0) {
  await nodes.first().click({ force: true, timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

const editorHeading = page.locator("text=Tashqi ko'rinish").first();
const editorVisible = (await editorHeading.count()) > 0;
check('tahrirlagich paneli ochildi', editorVisible, `${nodeCount} ta node`);

if (editorVisible) {
  await editorHeading.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  const before = await portraits.first().innerHTML();

  const regenerate = page.locator('button:has-text("Yangilash")').first();
  if ((await regenerate.count()) > 0) {
    await regenerate.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await portraits.first().innerHTML();
    check("'Yangilash' ko'rinishni o'zgartiradi", before !== after);
  } else {
    check("'Yangilash' tugmasi bor", false);
  }

  const keepIdentity = page.locator('button:has-text("Shaxsni saqla")').first();
  check("'Shaxsni saqla' tugmasi bor", (await keepIdentity.count()) > 0);

  // Changing the pinned gender must redraw the portrait. Flip to the opposite
  // of whatever the agent currently is, otherwise the click is a no-op.
  const genderSelect = page.locator('select').filter({ hasText: 'Erkak' }).first();
  if ((await genderSelect.count()) > 0) {
    const current = await genderSelect.inputValue();
    const beforeGender = await portraits.first().innerHTML();
    await genderSelect.selectOption(current === 'male' ? 'female' : 'male').catch(() => {});
    await page.waitForTimeout(1000);
    const afterGender = await portraits.first().innerHTML();
    check("jinsni qo'lda tanlash ishlaydi", beforeGender !== afterGender, `${current} → teskari`);
  } else {
    check('jins tanlagichi bor', false);
  }

  const panel = page.locator('.w-80').first();
  const box = await panel.boundingBox().catch(() => null);
  await page.screenshot({
    path: join(SHOT_DIR, 'portraits-editor.png'),
    ...(box ? { clip: box } : {}),
  });
}

console.log('\n3. Konsol xatolari');
// Pre-existing WebGPU/WebGL noise from the 3D layer is not this check's concern.
const uiErrors = errors.filter((e) => !/webgpu|webgl|gpu|three|shader|adapter/i.test(e));
check('interfeys xatosiz', uiErrors.length === 0, `${uiErrors.length} ta`);
uiErrors.slice(0, 10).forEach((e) => console.log('     x ' + e.slice(0, 250)));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${failed === 0 ? "HAMMASI O'TDI" : 'XATOLAR BOR'}: ${results.length - failed}/${results.length}`);
console.log(`skrinshotlar: ${SHOT_DIR}/portraits-graph.png, portraits-editor.png`);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
