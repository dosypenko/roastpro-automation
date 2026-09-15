// Instagram/Threads require a publicly reachable image URL - they fetch it themselves,
// they can't accept raw file uploads. Since this runs in a throwaway GitHub Actions
// container, the simplest free hosting is: commit the rendered PNGs straight into this
// same repo (must be a PUBLIC repo) and reference them via raw.githubusercontent.com.
//
// If you'd rather not make the repo public, swap this file for an upload to any
// object storage you control (Vercel Blob, S3, Cloudinary, imgur API, etc.) and
// return the resulting public URLs in the same shape.
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
    // Branch doesn't exist yet - create it from the default branch's current commit.
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

async function uploadImages(localPaths, runId) {
  await ensureBranchExists();
  const urls = [];

  for (let i = 0; i < localPaths.length; i++) {
    const content = fs.readFileSync(localPaths[i]).toString('base64');
    const repoPath = `media/${runId}/slide-${i + 1}.png`;

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: repoPath,
      message: `Add carousel media for run ${runId}`,
      content,
      branch: BRANCH,
    });

    urls.push(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${repoPath}`);
  }

  return urls;
}

export { uploadImages };
