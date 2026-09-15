// Keeps a running list of past carousel topics in the repo itself, so each new
// generation run can be told what's already been covered and avoid repeating it.
// Stored as data/topics-history.json on the repo's default branch.
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const OWNER = process.env.GITHUB_REPOSITORY_OWNER;
const REPO = process.env.GITHUB_REPOSITORY?.split('/')[1];
const HISTORY_PATH = 'data/topics-history.json';
const MAX_HISTORY_ITEMS_SENT_TO_PROMPT = 15;

async function getDefaultBranch() {
  const { data } = await octokit.repos.get({ owner: OWNER, repo: REPO });
  return data.default_branch;
}

// Returns { topics: string[], sha: string|null } - sha is needed to update the file later.
async function readHistory() {
  const branch = await getDefaultBranch();
  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: HISTORY_PATH,
      ref: branch,
    });
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { topics: JSON.parse(content), sha: data.sha, branch };
  } catch (err) {
    if (err.status === 404) {
      return { topics: [], sha: null, branch };
    }
    throw err;
  }
}

// Returns the most recent topics (as plain strings) to feed into the generation prompt.
async function getRecentTopics() {
  const { topics } = await readHistory();
  return topics.slice(-MAX_HISTORY_ITEMS_SENT_TO_PROMPT);
}

async function appendTopic(topic) {
  const { topics, sha, branch } = await readHistory();
  const updated = [...topics, { topic, date: new Date().toISOString() }];

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: HISTORY_PATH,
    message: `Log carousel topic: ${topic}`,
    content: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  });
}

export { getRecentTopics, appendTopic };
