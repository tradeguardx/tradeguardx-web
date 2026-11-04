// Renders the share images (1200x630) from the templates below.
// Run with: node scripts/render-og.mjs
// Keep them true for every visitor: no country claims, no local currency beyond
// an example, no latency figures, and only venues that are live today.
import puppeteer from 'puppeteer';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const SHIELD = `<svg width="42" height="46" viewBox="0 0 90 100" fill="none"><path d="M45 6C33 17 20 22 8 25c0 34 12 58 37 69 25-11 37-35 37-69-12-3-25-8-37-19Z" stroke="#2dd4aa" stroke-width="9" stroke-linejoin="round"/><path d="M29 50l12 12 21-23" stroke="#2dd4aa" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const row = (t) => `<li><i>✓</i>${t}</li>`;

const page = ({ line1, line2, sub, venues }) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Inter,Arial,sans-serif;color:#fff;background:radial-gradient(700px 420px at 12% 0,rgba(45,212,170,.14),transparent 70%),#07090f;padding:44px 56px;position:relative}
.brand{display:flex;align-items:center;gap:16px;font:700 26px 'Space Grotesk',Arial}
h1{font:700 62px/1.08 'Space Grotesk',Arial;margin-top:30px;letter-spacing:-.5px;width:640px}
h1 b{color:#2dd4aa;font-weight:700;display:block}
.sub{font-size:23px;line-height:1.42;color:#94a3a8;margin-top:20px;width:590px}
.k{position:absolute;left:56px;top:437px;font:600 12px 'JetBrains Mono',monospace;letter-spacing:.2em;color:#64748b}
.v{position:absolute;left:56px;top:462px;display:flex;gap:24px;font:700 21px 'Space Grotesk',Arial;color:#e2e8f0}
.card{position:absolute;right:60px;top:116px;width:430px;height:360px;border-radius:24px;padding:26px;background:#0e1216;border:1px solid rgba(255,255,255,.1)}
.fired{font:600 13px 'JetBrains Mono',monospace;letter-spacing:.14em;color:#f87171}
.fired:before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;background:#f87171;margin-right:10px;box-shadow:0 0 0 4px rgba(248,113,113,.2)}
.lim{margin-top:22px;border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:18px;display:flex;justify-content:space-between;align-items:flex-end}
.lim small{font-size:16px;color:#94a3a8;display:block;margin-bottom:8px}
.lim span{font:700 30px 'Space Grotesk',Arial;color:#f87171}
.lim em{font:600 11px 'JetBrains Mono',monospace;letter-spacing:.1em;color:#f87171;border:1px solid rgba(248,113,113,.4);border-radius:8px;padding:5px 8px}
ul{list-style:none;margin-top:22px}
li{font-size:17px;color:#d6dde0;display:flex;align-items:center;gap:12px;margin-bottom:15px}
li i{font-style:normal;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-size:12px;color:#2dd4aa;background:rgba(45,212,170,.14)}
.foot{position:absolute;left:56px;right:56px;bottom:32px;border-top:1px solid rgba(255,255,255,.08);padding-top:20px;display:flex;gap:30px;font-size:17px;color:#7c8b90}
.foot u{margin-left:auto;text-decoration:none;font:600 18px 'JetBrains Mono',monospace;color:#2dd4aa}
</style></head><body>
<div class="brand">${SHIELD}TradeGuardX</div>
<h1>${line1}<b>${line2}</b></h1>
<p class="sub">${sub}</p>
<div class="k">WORKS ON</div>
<div class="v">${venues.map((v) => `<span>${v}</span>`).join('')}</div>
<div class="card">
  <div class="fired">KILL SWITCH FIRED</div>
  <div class="lim"><div><small>Daily loss limit</small><span>−$200</span></div><em>BREACHED</em></div>
  <ul>${row('Open orders cancelled')}${row('Positions closed at market')}${row('Account locked until your reset')}</ul>
</div>
<div class="foot"><span>Runs on our servers</span><span>Web, phone and bots</span><u>tradeguardx.com</u></div>
</body></html>`;

const SUB = 'Set your daily loss limit once. Break it and we close your positions and lock the account.';

const IMAGES = [
  {
    out: 'public/og-image.png',
    line1: 'The kill switch for',
    line2: 'your trading day.',
    sub: SUB,
    venues: ['Delta', 'Exness', 'CoinDCX', 'Shark', 'BloFin'],
  },
  {
    out: 'public/og/crypto-kill-switch.png',
    line1: 'The crypto kill',
    line2: 'switch for futures.',
    sub: SUB,
    venues: ['Delta', 'CoinDCX', 'Shark', 'BloFin'],
  },
];

const browser = await puppeteer.launch({ headless: true });
for (const img of IMAGES) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await tab.setContent(page(img), { waitUntil: 'networkidle0' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ type: 'png', path: path.join(ROOT, img.out) });
  await tab.close();
  console.log('wrote', img.out);
}
await browser.close();
