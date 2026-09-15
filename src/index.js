import { generateCarouselContent } from './generateContent.js';
import { renderCarousel } from './renderSlides.js';
import { renderSlideshowVideo } from './renderVideo.js';
import { uploadVideo } from './hostImages.js';
import { publishInstagramReel, publishThreadsVideo } from './publish.js';
import { getRecentTopics, appendTopic } from './topicHistory.js';
import path from 'path';

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`Starting run ${runId}`);

  console.log('1/6 Checking recent topics to avoid repeats...');
  const recentTopics = await getRecentTopics();
  console.log(`Found ${recentTopics.length} past topics`);

  console.log('2/6 Generating content with Claude...');
  const content = await generateCarouselContent(recentTopics);
  console.log(`Topic: ${content.topic}`);

  console.log('3/6 Rendering slides to PNG...');
  const slidePaths = await renderCarousel(content, runId);
  console.log(`Rendered ${slidePaths.length} slides`);

  console.log('4/6 Building slideshow video...');
  const videoPath = path.join(path.dirname(slidePaths[0]), 'reel.mp4');
  renderSlideshowVideo(slidePaths, videoPath);
  console.log(`Video built: ${videoPath}`);

  console.log('5/6 Uploading video for public URL...');
  const videoUrl = await uploadVideo(videoPath, runId);
  console.log(videoUrl);

  console.log('6/6 Publishing...');
  const igPostId = await publishInstagramReel(videoUrl, content.caption);
  console.log(`Instagram Reel published: ${igPostId}`);

  const threadsPostId = await publishThreadsVideo(videoUrl, content.caption);
  console.log(`Threads video published: ${threadsPostId}`);

  await appendTopic(content.topic);

  console.log('Done.');
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
