import { generateCarouselContent } from './generateContent.js';
import { renderCarousel } from './renderSlides.js';
import { renderMotionVideo } from './renderMotionVideo.js';
import { uploadVideo, uploadImages } from './hostImages.js';
import {
  publishInstagramReel,
  publishThreadsVideo,
  publishInstagramCarousel,
  publishThreadsCarousel,
} from './publish.js';
import { execFileSync } from 'child_process';
import { getRecentTopics, appendTopic } from './topicHistory.js';
import fs from 'fs';
import path from 'path';

// Alternates by day: even day number = video (Reel), odd = carousel.
// Override with POST_FORMAT=video|carousel (e.g. from a manual workflow run).
function pickFormat() {
  const forced = (process.env.POST_FORMAT || '').toLowerCase();
  if (forced === 'video' || forced === 'carousel') return forced;
  const dayNumber = Math.floor(Date.now() / 86400000);
  return dayNumber % 2 === 0 ? 'video' : 'carousel';
}

// Instagram's publishing API only reliably accepts JPEG for images.
function toJpeg(pngPath) {
  const jpgPath = pngPath.replace(/\.png$/i, '.jpg');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', pngPath, '-q:v', '2', jpgPath]);
  return jpgPath;
}

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`Starting run ${runId}`);

  console.log('1/6 Checking recent topics to avoid repeats...');
  const recentTopics = await getRecentTopics();
  console.log(`Found ${recentTopics.length} past topics`);

  console.log('2/6 Generating content with Claude...');
  const content = await generateCarouselContent(recentTopics);
  console.log(`Topic: ${content.topic}`);

  const format = pickFormat();
  console.log(`Format today: ${format}`);

  const igCaption = `${content.caption}\n\nFirst roast free, link in bio \u{1F447}\n$4 one-time, no subscription.`;
  // Links are clickable on Threads but not in Instagram captions.
  const threadsText = `${content.caption.slice(0, 440)}\n\nFirst roast free: https://roastpro.ca`;

  if (format === 'video') {
    console.log('3-4/6 Rendering animated Reel...');
    const runDir = path.join('output', runId);
    fs.mkdirSync(runDir, { recursive: true });
    const videoPath = path.join(runDir, 'reel.mp4');
    await renderMotionVideo(content, videoPath);
    console.log(`Video built: ${videoPath}`);

    console.log('5/6 Uploading video for public URL...');
    const videoUrl = await uploadVideo(videoPath, runId);
    console.log(videoUrl);

    console.log('6/6 Publishing...');
    const igPostId = await publishInstagramReel(videoUrl, igCaption);
    console.log(`Instagram Reel published: ${igPostId}`);

    const threadsPostId = await publishThreadsVideo(videoUrl, threadsText);
    console.log(`Threads video published: ${threadsPostId}`);
  } else {
    console.log('3/6 Rendering slides to PNG...');
    const slidePaths = await renderCarousel(content, runId);
    console.log(`Rendered ${slidePaths.length} slides`);

    console.log('4/6 Converting slides to JPEG...');
    const jpgPaths = slidePaths.map(toJpeg);

    console.log('5/6 Uploading images for public URLs...');
    const imageUrls = await uploadImages(jpgPaths, runId);
    console.log(imageUrls.join('\n'));

    console.log('6/6 Publishing...');
    const igPostId = await publishInstagramCarousel(imageUrls, igCaption);
    console.log(`Instagram carousel published: ${igPostId}`);

    const threadsPostId = await publishThreadsCarousel(imageUrls, threadsText);
    console.log(`Threads carousel published: ${threadsPostId}`);
  }

  await appendTopic(content.topic);

  console.log('Done.');
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
