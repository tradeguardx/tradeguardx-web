// One-shot script to convert public/og-image.svg → public/og-image.png at 1200x630.
// Run with: node scripts/svg-to-og-png.mjs
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SVG_PATH = path.join(ROOT, 'public/og-image.svg');
const PNG_PATH = path.join(ROOT, 'public/og-image.png');

const svg = await fs.readFile(SVG_PATH, 'utf8');
const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
const buffer = await page.screenshot({ type: 'png', omitBackground: false });
await fs.writeFile(PNG_PATH, buffer);
await browser.close();

const stats = await fs.stat(PNG_PATH);
console.log(`Wrote ${PNG_PATH} (${(stats.size / 1024).toFixed(1)} KB)`);
