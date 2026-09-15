import fs from 'fs';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const OWNER = process.env.GITHUB_REPOSITORY_OWNER;
const REPO = process.env.GITHUB_REPOSITORY?.split('/')[1];
const BRANCH = 'generated-media';

async function ensureBranchExists() {
  try {
    await octokit.repos.getBranch({ owner: OWNER, repo: REPO, branch: BRANCH });
  } catch (err) {
    if (err.status !== 404) throw err;
    const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });
    const { data: ref } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${repoData.default_branch}`,
    });
    await octokit.git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: `refs/heads/${BRANCH}`,
      sha: ref.object.sha,
    });
  }
}

async function uploadFile(localPath, repoPath) {
  await ensureBranchExists();
  const content = fs.readFileSync(localPath).toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: repoPath,
    message: `Add generated media: ${repoPath}`,
    content,
    branch: BRANCH,
  });

  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${repoPath}`;
}

async function uploadImages(localPaths, runId) {
  const urls = [];
  for (let i = 0; i < localPaths.length; i++) {
    const url = await uploadFile(localPaths[i], `media/${runId}/slide-${i + 1}.png`);
    urls.push(url);
  }
  return urls;
}

async function uploadVideo(localPath, runId) {
  return uploadFile(localPath, `media/${runId}/reel.mp4`);
}

export { uploadImages, uploadVideo };
