import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are writing Instagram/Threads Reel content (a 4-slide slideshow) for RoastPro,
an AI resume analyzer built for the Canadian job market (roastpro.ca). It checks ATS match,
compares a resume to a real job posting and shows salary data by province. $4 one-time, first
roast free. The audience is people job hunting in Canada, frustrated with silent rejections.

Tone: direct, a little provocative, empathetic but not soft. Never corporate-sounding.
No emojis in the slide text. Sentence case, not Title Case.

HOOK RULES (slide 1 decides whether anyone watches):
- Open with a pain, a surprising fact or a contrarian claim a job seeker immediately recognizes
  ("Your resume was rejected before a human saw it"). Never start with a generic label.
- Headline max 9 words. Make it concrete, not abstract.

CANADA ANGLE: whenever it fits, use Canadian specifics (Canadian vs US resume norms, no photo/age/
marital status on a Canadian resume, "Canadian experience" objection, Job Bank/NOC codes,
bilingual roles, provincial salary differences, newcomers' resumes). Rotate across these
pillars so feed variety stays high: ATS mechanics, resume content mistakes, Canadian norms,
salary and negotiation, newcomer-specific advice, myths vs reality.

HONESTY RULES (non-negotiable):
- Never invent statistics. Use a number only if it is a widely cited, real figure, and name the
  source in statLabel (e.g. "Ladders eye-tracking study" for the ~7 second resume scan).
- If you do not know a trustworthy figure, make slide 2 a concrete rule of thumb or a clear
  claim instead, with statNumber like "1 page" or "3 of 3" and no fake percentages.
- Do not promise interviews or jobs. RoastPro finds problems; it does not guarantee results.

Slide 4 CTA must be concrete: the headline names the benefit (for example "See why your resume
gets filtered out"), and the offer is the first roast being free. ctaText stays "Link in bio".

You must return ONLY valid JSON (no markdown fences, no commentary) matching EXACTLY
this shape, with every field present and non-empty - do not omit any key, do not rename
any key, do not add extra top-level keys:
{
  "topic": "short internal label for this carousel",
  "slide1_hook": { "eyebrow": "...", "headline": "...", "accentWord": "...", "subtext": "..." },
  "slide2_stat": { "eyebrow": "...", "statNumber": "...", "statLabel": "...", "subtext": "..." },
  "slide3_checklist": { "eyebrow": "...", "title": "...", "items": ["...", "...", "..."] },
  "slide4_cta": { "eyebrow": "...", "headline": "...", "accentWord": "...", "ctaText": "Link in bio" },
  "caption": "Caption, max 350 characters. First line is a hook that stands on its own. Then 1-2 sentences of value. Do NOT mention links or prices (added automatically). End with 4-5 hashtags, at least two Canada-specific (#jobsearchcanada #torontojobs #canadajobs #resumetips #ats)."
}

"accentWord" must be a single word or short phrase that literally appears inside "headline" -
it will be highlighted in a different color. Pick a different angle each time so content
does not repeat across posts.`;

function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== 'object') return ['content is not an object'];

  if (!content.topic) errors.push('missing topic');

  const s1 = content.slide1_hook;
  if (!s1) errors.push('missing slide1_hook');
  else ['eyebrow', 'headline', 'accentWord', 'subtext'].forEach((k) => {
    if (!s1[k]) errors.push(`missing slide1_hook.${k}`);
  });

  const s2 = content.slide2_stat;
  if (!s2) errors.push('missing slide2_stat');
  else ['eyebrow', 'statNumber', 'statLabel', 'subtext'].forEach((k) => {
    if (!s2[k]) errors.push(`missing slide2_stat.${k}`);
  });

  const s3 = content.slide3_checklist;
  if (!s3) errors.push('missing slide3_checklist');
  else {
    ['eyebrow', 'title'].forEach((k) => {
      if (!s3[k]) errors.push(`missing slide3_checklist.${k}`);
    });
    if (!Array.isArray(s3.items) || s3.items.length === 0) {
      errors.push('missing or empty slide3_checklist.items');
    }
  }

  const s4 = content.slide4_cta;
  if (!s4) errors.push('missing slide4_cta');
  else ['eyebrow', 'headline', 'accentWord', 'ctaText'].forEach((k) => {
    if (!s4[k]) errors.push(`missing slide4_cta.${k}`);
  });

  if (!content.caption) errors.push('missing caption');

  return errors;
}

async function requestOnce(recentTopics) {
  const avoidanceNote =
    recentTopics.length > 0
      ? `\n\nThese topics were already covered in recent posts - pick a genuinely different angle, do not rephrase them:\n${recentTopics
          .map((t) => `- ${typeof t === 'string' ? t : t.topic}`)
          .join('\n')}`
      : '';

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate one new carousel.${avoidanceNote}`,
      },
    ],
  });

  let text = message.content[0].text.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) text = fenceMatch[1];
  return JSON.parse(text);
}

async function generateCarouselContent(recentTopics = [], maxAttempts = 3) {
  let lastErrors = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await requestOnce(recentTopics);
    const errors = validateContent(content);
    if (errors.length === 0) return content;

    lastErrors = errors;
    console.warn(`Attempt ${attempt}: generated content failed validation: ${errors.join(', ')}`);
  }
  throw new Error(`Content generation failed validation after ${maxAttempts} attempts: ${lastErrors.join(', ')}`);
}

export { generateCarouselContent };

if (import.meta.url === `file://${process.argv[1]}`) {
  generateCarouselContent()
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((err) => {
      console.error('Content generation failed:', err);
      process.exit(1);
    });
}
