// Generates the text content for one carousel using the Claude API.
// Returns a structured JSON object describing all 5 slides.
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are writing Instagram/Threads carousel content for RoastPro,
an AI resume analyzer for job seekers (roastpro.ca). The audience is people actively
job hunting, frustrated with rejections, often unaware their resume is filtered by
ATS (Applicant Tracking System) software before a human sees it.

Tone: direct, a little provocative, empathetic but not soft. Never corporate-sounding.
No emojis in the carousel text itself. Sentence case, not Title Case.

You must return ONLY valid JSON (no markdown fences, no commentary) matching this shape:
{
  "topic": "short internal label for this carousel",
  "slide1_hook": { "eyebrow": "...", "headline": "...", "accentWord": "...", "subtext": "..." },
  "slide2_stat": { "eyebrow": "...", "statNumber": "...", "statLabel": "...", "subtext": "..." },
  "slide3_checklist": { "eyebrow": "...", "title": "...", "items": ["...", "...", "..."] },
  "slide4_cta": { "eyebrow": "...", "headline": "...", "accentWord": "...", "ctaText": "Try RoastPro free" },
  "caption": "Instagram/Threads caption for this post, 2-4 sentences, ending with a soft call to action. Include 3-5 relevant hashtags at the end."
}

"accentWord" must be a single word or short phrase that literally appears inside "headline" —
it will be highlighted in a different color. Pick a different real statistic and a different
angle each time (ATS keyword matching, formatting parsers, resume length, quantifying achievements,
tailoring per job, etc.) so content does not repeat across posts.`;

async function generateCarouselContent(recentTopics = []) {
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

  const text = message.content[0].text.trim();
  return JSON.parse(text);
}

export { generateCarouselContent };

// Allow running standalone: `node src/generateContent.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCarouselContent()
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((err) => {
      console.error('Content generation failed:', err);
      process.exit(1);
    });
}
