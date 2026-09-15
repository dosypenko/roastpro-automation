// Full pipeline: generate content -> render slides -> host images -> publish.
// This is the script the GitHub Actions cron job calls.
import { generateCarouselContent } from './generateContent.js';
import { renderCarousel } from './renderSlides.js';
import { uploadImages } from './hostImages.js';
import { publishInstagramCarousel, publishThreadsPost } from './publish.js';
import { getRecentTopics, appendTopic } from './topicHistory.js';

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`Starting run ${runId}`);

  console.log('1/5 Checking recent topics to avoid repeats...');
  const recentTopics = await getRecentTopics();
  console.log(`Found ${recentTopics.length} past topics`);

  console.log('2/5 Generating content with Claude...');
  const content = await generateCarouselContent(recentTopics);
  console.log(`Topic: ${content.topic}`);

  console.log('3/5 Rendering slides to PNG...');
  const localPaths = await renderCarousel(content, runId);
  console.log(`Rendered ${localPaths.length} slides`);

  console.log('4/5 Uploading images for public URLs...');
  const publicUrls = await uploadImages(localPaths, runId);
  console.log(publicUrls);

  console.log('5/5 Publishing...');
  const igPostId = await publishInstagramCarousel(publicUrls, content.caption);
  console.log(`Instagram published: ${igPostId}`);

  // Threads: post just the hook slide (slide 1) with the same caption as a single image post.
  const threadsPostId = await publishThreadsPost(publicUrls[0], content.caption);
  console.log(`Threads published: ${threadsPostId}`);

  // Record the topic so future runs know to avoid repeating it.
  await appendTopic(content.topic);

  console.log('Done.');
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
