// Renders an animated 1080x1920 Reel from templates/motion.html.
// The page is a deterministic function of time (window.renderAt(t)), so we step through
// frames, screenshot each one and pipe the JPEG stream into ffmpeg.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, '..', 'templates', 'motion.html');
const MUSIC = path.join(__dirname, '..', 'assets', 'background-music.mp3');
const FPS = 30;

async function renderMotionVideo(content, outputPath) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.evaluateOnNewDocument((c) => {
      window.__CONTENT__ = c;
    }, content);
    await page.goto(`file://${TEMPLATE}`, { waitUntil: 'load', timeout: 30000 });
    // Give web fonts a moment, but never hang if they are blocked.
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 5000)),
    ]);

    const total = await page.evaluate(() => window.TOTAL_SECONDS);
    const frames = Math.round(total * FPS);

    const hasMusic = fs.existsSync(MUSIC);
    const args = [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
    ];
    if (hasMusic) {
      args.push('-stream_loop', '-1', '-i', MUSIC);
    }
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-r', String(FPS));
    if (hasMusic) {
      args.push(
        '-af', `afade=t=in:st=0:d=0.5,afade=t=out:st=${total - 1.5}:d=1.5`,
        '-c:a', 'aac', '-b:a', '128k', '-t', String(total), '-shortest',
      );
    } else {
      args.push('-an');
    }
    args.push(outputPath);

    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((resolve, reject) => {
      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
    });

    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.renderAt(t), i / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ffmpeg.stdin.write(buf)) {
        await new Promise((r) => ffmpeg.stdin.once('drain', r));
      }
    }
    ffmpeg.stdin.end();
    await done;
  } finally {
    await browser.close();
  }
  return outputPath;
}

export { renderMotionVideo };

// Local test: node src/renderMotionVideo.js content.json out.mp4
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , contentPath, out = 'motion-test.mp4'] = process.argv;
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
  const t0 = Date.now();
  renderMotionVideo(content, out)
    .then(() => console.log(`Rendered ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`))
    .catch((e) => { console.error(e); process.exit(1); });
}
