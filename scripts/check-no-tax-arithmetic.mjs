#!/usr/bin/env node
/**
 * CI guard: the Tax Centre must not compute tax.
 *
 * The 30% F&O calculation was once copied out of a design fixture straight into
 * the page, and shipped invisibly because the account was down for the year —
 * `max(0, loss) * 0.3` is zero, so the card looked right. On a profitable year
 * it would have shown a wrong figure to someone about to file.
 *
 * Deliberately SCOPED to tax UI files. Banning `* 0.3` across the app would be
 * noise, and noisy guards get disabled.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/pages", "src/components", "src/api"];
const IS_TAX_FILE = /tax/i;

/** Patterns that mean the UI is doing tax arithmetic rather than rendering it. */
const BANNED = [
  { re: /\*\s*0\.30?\b/, why: "applies a 30% rate — tax rates belong to the tax engine" },
  { re: /\/\s*0\.30?\b/, why: "divides by a tax rate — tax arithmetic in the UI" },
  { re: /\bfnoTax\b|\bestimatedFnoTax\b|\bfnoTaxAmount\b|\bfnoTaxRate\b/, why: "names a computed F&O tax; the engine deliberately returns none" },
  { re: /taxableBusinessIncome\s*\*\s*[\d.]/, why: "multiplies taxable income by a rate" },
  { re: /economic\w*\s*\*\s*[\d.]/, why: "multiplies the economic result by a rate" },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(e) && IS_TAX_FILE.test(full) && !/\.test\./.test(full)) out.push(full);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r));
const violations = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // Comments describing the rule are not violations of it.
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    if (!code.trim() || code.trim().startsWith("*")) return;
    for (const { re, why } of BANNED) {
      if (re.test(code)) violations.push({ file, line: i + 1, text: line.trim(), why });
    }
  });
}

if (violations.length) {
  console.error("\n✖ Tax arithmetic found in presentation code.\n");
  console.error("  The Tax Centre renders what the versioned tax engine returns.");
  console.error("  It must never compute a tax amount, rate, deduction or set-off.\n");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text}`);
    console.error(`    → ${v.why}\n`);
  }
  console.error("  If a tax figure is genuinely needed, add it to the tax engine");
  console.error("  behind a version, and render the field it returns.\n");
  process.exit(1);
}

console.log(`✓ No tax arithmetic in ${files.length} tax UI file(s).`);
