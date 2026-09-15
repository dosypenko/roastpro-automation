// Fills the HTML templates with generated content and renders each to a 1080x1080 PNG.
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

function dotsHtml(activeIndex, total = 5) {
  return Array.from({ length: total }, (_, i) =>
    `<div class="dot${i === activeIndex ? ' active' : ''}"></div>`
  ).join('');
}

function highlightAccent(headline, accentWord) {
  if (!accentWord) return headline;
  const escaped = accentWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'i');
  return headline.replace(re, '<span class="accent">$1</span>');
}

function buildSlideHtml(templateName, replacements) {
  let html = fs.readFileSync(path.join(TEMPLATES_DIR, `${templateName}.html`), 'utf-8');
  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(`{{${key}}}`).join(value);
  }
  return html;
}

async function renderHtmlToPng(browser, html, outputPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath });
  await page.close();
}

async function renderCarousel(content, runId) {
  const runDir = path.join(OUTPUT_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const slidePaths = [];

  // Slide 1: hook
  const s1 = buildSlideHtml('hook', {
    EYEBROW: content.slide1_hook.eyebrow,
    HEADLINE_HTML: highlightAccent(content.slide1_hook.headline, content.slide1_hook.accentWord),
    SUBTEXT: content.slide1_hook.subtext,
    DOTS: dotsHtml(0),
  });
  const p1 = path.join(runDir, 'slide-1.png');
  await renderHtmlToPng(browser, s1, p1);
  slidePaths.push(p1);

  // Slide 2: stat
  const s2 = buildSlideHtml('stat', {
    EYEBROW: content.slide2_stat.eyebrow,
    STAT_NUMBER: content.slide2_stat.statNumber,
    STAT_LABEL: content.slide2_stat.statLabel,
    SUBTEXT: content.slide2_stat.subtext,
    DOTS: dotsHtml(1),
  });
  const p2 = path.join(runDir, 'slide-2.png');
  await renderHtmlToPng(browser, s2, p2);
  slidePaths.push(p2);

  // Slide 3: checklist
  const itemsHtml = content.slide3_checklist.items
    .map(
      (item, i) => `<div class="item"><div class="num">0${i + 1}</div><div class="item-text">${item}</div></div>`
    )
    .join('\n');
  const s3 = buildSlideHtml('checklist', {
    EYEBROW: content.slide3_checklist.eyebrow,
    TITLE: content.slide3_checklist.title,
    ITEMS_HTML: itemsHtml,
    DOTS: dotsHtml(2),
  });
  const p3 = path.join(runDir, 'slide-3.png');
  await renderHtmlToPng(browser, s3, p3);
  slidePaths.push(p3);

  // Slide 4: CTA
  const s4 = buildSlideHtml('cta', {
    EYEBROW: content.slide4_cta.eyebrow,
    HEADLINE_HTML: highlightAccent(content.slide4_cta.headline, content.slide4_cta.accentWord),
    CTA_TEXT: content.slide4_cta.ctaText,
    DOTS: dotsHtml(3),
  });
  const p4 = path.join(runDir, 'slide-4.png');
  await renderHtmlToPng(browser, s4, p4);
  slidePaths.push(p4);

  await browser.close();
  return slidePaths;
}

export { renderCarousel };
