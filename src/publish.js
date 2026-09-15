// Publishes a carousel (multiple images) to Instagram, and a single-image post to Threads.
import fetch from 'node-fetch';

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN;

async function postJson(url, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: 'POST', body });
  const data = await res.json();
  if (data.error) {
    throw new Error(`API error: ${JSON.stringify(data.error)}`);
  }
  return data;
}

// --- Instagram carousel ---
async function publishInstagramCarousel(imageUrls, caption) {
  // Step 1: create a child container for each image (is_carousel_item=true)
  const childIds = [];
  for (const url of imageUrls) {
    const { id } = await postJson('https://graph.instagram.com/v21.0/me/media', {
      image_url: url,
      is_carousel_item: 'true',
      access_token: IG_TOKEN,
    });
    childIds.push(id);
  }

  // Step 2: create the parent carousel container
  const { id: creationId } = await postJson('https://graph.instagram.com/v21.0/me/media', {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: IG_TOKEN,
  });

  // Step 3: publish it
  const { id: publishedId } = await postJson('https://graph.instagram.com/v21.0/me/media_publish', {
    creation_id: creationId,
    access_token: IG_TOKEN,
  });

  return publishedId;
}

// --- Threads single-image post (Threads carousels follow the same two-step pattern
// as Instagram if you want to extend this to multiple images later) ---
async function publishThreadsPost(imageUrl, text) {
  const { id: creationId } = await postJson('https://graph.threads.net/v1.0/me/threads', {
    media_type: 'IMAGE',
    image_url: imageUrl,
    text,
    access_token: THREADS_TOKEN,
  });

  const { id: publishedId } = await postJson('https://graph.threads.net/v1.0/me/threads_publish', {
    creation_id: creationId,
    access_token: THREADS_TOKEN,
  });

  return publishedId;
}

export { publishInstagramCarousel, publishThreadsPost };
