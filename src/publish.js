// Publishes a carousel (multiple images) to both Instagram and Threads.
import fetch from 'node-fetch';

const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(url, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: 'POST', body });
  const data = await res.json();
  if (data.error) {
    throw new Error(`API error: ${JSON.stringify(data.error)}`);
  }
  return data;
}

async function getJson(url, params) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${url}?${query}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`API error: ${JSON.stringify(data.error)}`);
  }
  return data;
}

async function waitUntilFinished(containerId, token, graphHost, apiVersion, statusField = 'status_code', maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await getJson(`https://${graphHost}/${apiVersion}/${containerId}`, {
      fields: statusField,
      access_token: token,
    });
    const status = data[statusField];

    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Container ${containerId} failed processing (status: ${status})`);
    }

    await sleep(3000);
  }
  throw new Error(`Container ${containerId} did not finish processing in time`);
}

async function publishInstagramCarousel(imageUrls, caption) {
  const childIds = [];
  for (const url of imageUrls) {
    const { id } = await postJson('https://graph.instagram.com/v21.0/me/media', {
      image_url: url,
      is_carousel_item: 'true',
      access_token: IG_TOKEN,
    });
    await waitUntilFinished(id, IG_TOKEN, 'graph.instagram.com', 'v21.0');
    childIds.push(id);
  }

  const { id: creationId } = await postJson('https://graph.instagram.com/v21.0/me/media', {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: IG_TOKEN,
  });

  await waitUntilFinished(creationId, IG_TOKEN, 'graph.instagram.com', 'v21.0');

  const { id: publishedId } = await postJson('https://graph.instagram.com/v21.0/me/media_publish', {
    creation_id: creationId,
    access_token: IG_TOKEN,
  });

  return publishedId;
}

async function publishThreadsCarousel(imageUrls, text) {
  const childIds = [];
  for (const url of imageUrls) {
    const { id } = await postJson('https://graph.threads.net/v1.0/me/threads', {
      media_type: 'IMAGE',
      image_url: url,
      is_carousel_item: 'true',
      access_token: THREADS_TOKEN,
    });
    await waitUntilFinished(id, THREADS_TOKEN, 'graph.threads.net', 'v1.0', 'status');
    childIds.push(id);
  }

  const { id: creationId } = await postJson('https://graph.threads.net/v1.0/me/threads', {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    text,
    access_token: THREADS_TOKEN,
  });

  await waitUntilFinished(creationId, THREADS_TOKEN, 'graph.threads.net', 'v1.0', 'status');

  const { id: publishedId } = await postJson('https://graph.threads.net/v1.0/me/threads_publish', {
    creation_id: creationId,
    access_token: THREADS_TOKEN,
  });

  return publishedId;
}

export { publishInstagramCarousel, publishThreadsCarousel };
