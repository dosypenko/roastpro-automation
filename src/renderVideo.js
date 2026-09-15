import { execFileSync } from 'child_process';
import path from 'path';

const SLIDE_SECONDS = 3.5;
const TRANSITION_SECONDS = 0.6;
const MUSIC_PATH = path.join(process.cwd(), 'assets', 'background-music.mp3');

function fileExists(p) {
  try {
    execFileSync('test', ['-f', p]);
    return true;
  } catch {
    return false;
  }
}

function renderSlideshowVideo(slidePaths, outputPath) {
  const n = slidePaths.length;
  const inputs = [];
  slidePaths.forEach((p) => {
    inputs.push('-loop', '1', '-t', String(SLIDE_SECONDS + TRANSITION_SECONDS), '-i', p);
  });

  let filterParts = [];
  let lastLabel = '0:v';
  for (let i = 1; i < n; i++) {
    const offset = i * SLIDE_SECONDS;
    const outLabel = `v${i}`;
    filterParts.push(
      `[${lastLabel}][${i}:v]xfade=transition=fade:duration=${TRANSITION_SECONDS}:offset=${offset}[${outLabel}]`
    );
    lastLabel = outLabel;
  }
  const finalLabel = 'padded';
  filterParts.push(
    `[${lastLabel}]scale=1080:1080,pad=1080:1920:0:(1920-1080)/2:color=#0B1416[${finalLabel}]`
  );

  const filterComplex = filterParts.join(';');
  const hasMusic = fileExists(MUSIC_PATH);
  const args = [
    ...inputs,
    ...(hasMusic ? ['-i', MUSIC_PATH] : []),
    '-filter_complex', filterComplex,
    '-map', `[${finalLabel}]`,
    ...(hasMusic ? ['-map', `${n}:a`, '-shortest'] : []),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    ...(hasMusic ? ['-c:a', 'aac', '-b:a', '128k'] : []),
    '-y',
    outputPath,
  ];

  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  return outputPath;
}

export { renderSlideshowVideo };
