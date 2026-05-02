/**
 * generate-docs-pdf.mjs
 *
 * Generates a single combined PDF from all Mintlify docs pages.
 *
 * Strategy: convert MDX → clean Markdown → pandoc HTML → weasyprint PDF.
 * Falls back to Chrome headless if weasyprint is unavailable.
 *
 * Usage:
 *   node scripts/generate-docs-pdf.mjs
 *   node scripts/generate-docs-pdf.mjs --output dist/wa-kijo-handbook.pdf
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_SITE = path.join(ROOT, 'docs-site');

// ── CLI args ─────────────────────────────────────────────────────────────────
const outputArg = process.argv.indexOf('--output');
const OUTPUT_PDF = outputArg !== -1
  ? path.resolve(process.argv[outputArg + 1])
  : path.join(ROOT, 'dist', 'wa-kijo-handbook.pdf');

// ── Navigation order (mirrors docs.json) ─────────────────────────────────────
const PAGES = [
  // Get started
  'introduction.mdx',
  'quickstart.mdx',
  'what-you-get.mdx',
  'support.mdx',
  // Concepts
  'concepts/architecture.mdx',
  'concepts/multi-tenancy.mdx',
  'concepts/authentication.mdx',
  'concepts/rbac.mdx',
  'concepts/data-model.mdx',
  'concepts/background-jobs.mdx',
  'concepts/observability.mdx',
  // Guides
  'guides/add-feature-module.mdx',
  'guides/customize-billing.mdx',
  'guides/integrate-third-party-api.mdx',
  'guides/deploy-to-railway.mdx',
  'guides/deploy-to-aws.mdx',
  'guides/customise-branding.mdx',
  // Reference
  'reference/configuration.mdx',
  'reference/cli.mdx',
  'reference/error-codes.mdx',
  'reference/permissions.mdx',
  // Release
  'changelog.mdx',
  'upgrade-guide.mdx',
  'roadmap.mdx',
  // Troubleshooting
  'troubleshooting.mdx',
];

// ── MDX → clean Markdown ─────────────────────────────────────────────────────

/**
 * Strip / convert Mintlify MDX component syntax to plain Markdown.
 * We handle the most common components; unknown JSX tags are removed.
 */
function cleanMdx(raw) {
  let s = raw;

  // Remove YAML frontmatter
  s = s.replace(/^---[\s\S]*?---\s*\n?/, '');

  // Mintlify callout components → blockquote with icon prefix
  s = s.replace(/<Info>([\s\S]*?)<\/Info>/g, (_, body) =>
    `> **ℹ️  Info**\n>\n${body.trim().split('\n').map(l => `> ${l}`).join('\n')}\n`);
  s = s.replace(/<Warning>([\s\S]*?)<\/Warning>/g, (_, body) =>
    `> **⚠️  Warning**\n>\n${body.trim().split('\n').map(l => `> ${l}`).join('\n')}\n`);
  s = s.replace(/<Note>([\s\S]*?)<\/Note>/g, (_, body) =>
    `> **📝  Note**\n>\n${body.trim().split('\n').map(l => `> ${l}`).join('\n')}\n`);
  s = s.replace(/<Tip>([\s\S]*?)<\/Tip>/g, (_, body) =>
    `> **💡  Tip**\n>\n${body.trim().split('\n').map(l => `> ${l}`).join('\n')}\n`);
  s = s.replace(/<Check>([\s\S]*?)<\/Check>/g, (_, body) =>
    `> **✅  Check**\n>\n${body.trim().split('\n').map(l => `> ${l}`).join('\n')}\n`);

  // Card / CardGroup → h3 heading + body
  s = s.replace(/<Card\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/Card>/g,
    (_, title, body) => `### ${title}\n\n${body.trim()}\n`);
  s = s.replace(/<CardGroup[^>]*>\s*/g, '').replace(/\s*<\/CardGroup>/g, '\n');

  // Tabs → each tab becomes an h4 heading
  s = s.replace(/<Tab\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/Tab>/g,
    (_, title, body) => `#### ${title}\n\n${body.trim()}\n`);
  s = s.replace(/<Tabs>\s*/g, '').replace(/\s*<\/Tabs>/g, '\n');

  // Steps
  s = s.replace(/<Step\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/Step>/g,
    (_, title, body) => `**${title}**\n\n${body.trim()}\n`);
  s = s.replace(/<Steps>\s*/g, '').replace(/\s*<\/Steps>/g, '\n');

  // CodeGroup (just unwrap)
  s = s.replace(/<CodeGroup>\s*/g, '').replace(/\s*<\/CodeGroup>/g, '\n');

  // Accordion
  s = s.replace(/<Accordion\s+title="([^"]*)"[^>]*>([\s\S]*?)<\/Accordion>/g,
    (_, title, body) => `**${title}**\n\n${body.trim()}\n`);
  s = s.replace(/<AccordionGroup>\s*/g, '').replace(/\s*<\/AccordionGroup>/g, '\n');

  // Self-closing Mintlify components (e.g. <br />, custom icons)
  s = s.replace(/<[A-Z][A-Za-z]*(\s[^>]*)?\s*\/>/g, '');

  // Remaining block-level JSX tags — keep inner content
  s = s.replace(/<([A-Z][A-Za-z]*)(\s[^>]*)?>([\s\S]*?)<\/\1>/g,
    (_, _tag, _attrs, body) => body.trim());

  // Clean up excessive blank lines
  s = s.replace(/\n{4,}/g, '\n\n\n');

  return s.trim();
}

// ── Page title from first heading ────────────────────────────────────────────
function extractTitle(content) {
  const m = content.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : null;
}

// ── Combine all pages ─────────────────────────────────────────────────────────
console.log('📄  Collecting documentation pages…\n');

const sections = [];
let missing = 0;

for (const page of PAGES) {
  const filePath = path.join(DOCS_SITE, page);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  Missing: ${page}`);
    missing++;
    continue;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const cleaned = cleanMdx(raw);
  const title = extractTitle(cleaned) ?? path.basename(page, '.mdx');
  sections.push({ page, title, content: cleaned });
  console.log(`   ✓  ${page}  (${title})`);
}

console.log(`\n   ${sections.length} pages collected, ${missing} missing.\n`);

// ── Build combined Markdown ───────────────────────────────────────────────────
const date = new Date().toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
});

const TOC = sections.map((s, i) =>
  `${i + 1}. ${s.title}`
).join('\n');

const body = sections.map(s => s.content).join('\n\n\\newpage\n\n');

const combined = `---
title: "wa'kijo Handbook"
subtitle: "Production-grade multi-tenant SaaS boilerplate"
date: "${date}"
version: "0.0.5"
author: "wa'kijo"
lang: en
---

# wa'kijo Handbook

> Production-grade multi-tenant SaaS boilerplate — v0.0.5 · ${date}

## Table of Contents

${TOC}

\\newpage

${body}
`;

const TMP_MD = path.join('/tmp', 'wa-kijo-handbook.md');
fs.writeFileSync(TMP_MD, combined, 'utf-8');
console.log(`📝  Combined Markdown written to ${TMP_MD}\n`);

// ── Pandoc CSS stylesheet ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --primary: #FF5A1F;
  --text: #111827;
  --muted: #6B7280;
  --border: #E5E7EB;
  --bg-code: #F9FAFB;
  --page-margin: 2cm;
}

@page {
  margin: var(--page-margin) var(--page-margin) 2.5cm var(--page-margin);
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-family: Inter, sans-serif;
    font-size: 9pt;
    color: var(--muted);
  }
  @bottom-left {
    content: "wa'kijo Handbook v0.0.5";
    font-family: Inter, sans-serif;
    font-size: 9pt;
    color: var(--muted);
  }
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 10pt;
  line-height: 1.7;
  color: var(--text);
  max-width: 100%;
}

h1 { font-size: 22pt; font-weight: 700; color: #111827; margin-top: 0; border-bottom: 2px solid var(--primary); padding-bottom: 6pt; }
h2 { font-size: 16pt; font-weight: 600; color: #111827; margin-top: 24pt; border-bottom: 1px solid var(--border); padding-bottom: 4pt; }
h3 { font-size: 13pt; font-weight: 600; color: #1F2937; margin-top: 18pt; }
h4 { font-size: 11pt; font-weight: 600; color: #374151; margin-top: 12pt; }

a { color: var(--primary); text-decoration: none; }

code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 8.5pt;
  background: var(--bg-code);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1pt 4pt;
}

pre {
  background: #1E293B;
  color: #E2E8F0;
  border-radius: 6px;
  padding: 12pt;
  overflow-x: auto;
  margin: 10pt 0;
  page-break-inside: avoid;
}

pre code {
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
  font-size: 8pt;
}

blockquote {
  border-left: 4px solid var(--primary);
  margin: 12pt 0;
  padding: 6pt 12pt;
  background: #FFF7F5;
  color: #374151;
  border-radius: 0 4px 4px 0;
  page-break-inside: avoid;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12pt 0;
  font-size: 9pt;
  page-break-inside: avoid;
}

th {
  background: #F3F4F6;
  font-weight: 600;
  text-align: left;
  padding: 6pt 10pt;
  border: 1px solid var(--border);
}

td {
  padding: 5pt 10pt;
  border: 1px solid var(--border);
  vertical-align: top;
}

tr:nth-child(even) td { background: #F9FAFB; }

ul, ol { padding-left: 18pt; }
li { margin: 3pt 0; }

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 20pt 0;
}

.title-page {
  text-align: center;
  padding-top: 80pt;
}
`;

const TMP_CSS = path.join('/tmp', 'wa-kijo-handbook.css');
fs.writeFileSync(TMP_CSS, CSS, 'utf-8');

// ── Ensure output directory exists ────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUTPUT_PDF), { recursive: true });

// ── Run pandoc → HTML ─────────────────────────────────────────────────────────
const TMP_HTML = path.join('/tmp', 'wa-kijo-handbook.html');

console.log('🔧  Running pandoc (Markdown → HTML)…');
const pandocResult = spawnSync('pandoc', [
  TMP_MD,
  '--from=markdown+yaml_metadata_block+smart',
  '--to=html5',
  '--standalone',
  '--toc',
  '--toc-depth=2',
  '--number-sections',
  `--css=${TMP_CSS}`,
  '--highlight-style=espresso',
  '--metadata=lang:en',
  '-o', TMP_HTML,
], { stdio: ['ignore', 'pipe', 'pipe'] });

if (pandocResult.status !== 0) {
  console.error('pandoc failed:', pandocResult.stderr?.toString());
  process.exit(1);
}
console.log('   ✓  HTML generated\n');

// ── Render PDF ────────────────────────────────────────────────────────────────
// Try weasyprint first (installed); fall back to Chrome headless.

const weasyprintCheck = spawnSync('weasyprint', ['--version'], { stdio: 'pipe' });
const hasWeasyprint = weasyprintCheck.status === 0;

if (hasWeasyprint) {
  console.log('🖨️   Running weasyprint (HTML → PDF)…');
  const wp = spawnSync('weasyprint', [TMP_HTML, OUTPUT_PDF, '--quiet'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (wp.status !== 0) {
    console.error('weasyprint failed:', wp.stderr?.toString());
    // Fall through to Chrome
  } else {
    printSuccess(OUTPUT_PDF);
    process.exit(0);
  }
}

// ── Chrome headless fallback ──────────────────────────────────────────────────
console.log('🖨️   Running Chrome headless (HTML → PDF)…');

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  `${process.env.HOME}/.cache/puppeteer/chrome/mac_arm-127.0.6533.72/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
];

const chromePath = CHROME_PATHS.find(p => fs.existsSync(p));
if (!chromePath) {
  console.error('No Chrome binary found. Install Google Chrome or run: brew install --cask google-chrome');
  process.exit(1);
}

const fileUrl = `file://${TMP_HTML}`;
const chromeResult = spawnSync(chromePath, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--print-to-pdf=${OUTPUT_PDF}`,
  '--print-to-pdf-no-header',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=5000',
  fileUrl,
], { stdio: ['ignore', 'pipe', 'pipe'] });

if (chromeResult.status !== 0) {
  console.error('Chrome headless failed:', chromeResult.stderr?.toString());
  process.exit(1);
}

printSuccess(OUTPUT_PDF);

function printSuccess(outPath) {
  const stats = fs.statSync(outPath);
  const kb = Math.round(stats.size / 1024);
  console.log(`\n✅  PDF generated successfully!\n`);
  console.log(`   📄  ${outPath}`);
  console.log(`   📦  ${kb} KB\n`);
}
