import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizeRoadmap } from '../shared/normalize.js';
import { mockRoadmap } from '../shared/mockRoadmap.js';

const app = express();
app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.PORT) || 8787;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const hasKey = () => Boolean(process.env.GEMINI_API_KEY?.trim());

const schema = {
  type: 'OBJECT',
  properties: {
    goalJa: { type: 'STRING' },
    summary: { type: 'STRING' },
    summaryJa: { type: 'STRING' },
    nodes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          titleJa: { type: 'STRING' },
          description: { type: 'STRING' },
          descriptionJa: { type: 'STRING' },
          hours: { type: 'NUMBER' },
          week: { type: 'INTEGER' },
          difficulty: { type: 'INTEGER' },
          restAfter: { type: 'BOOLEAN' },
          restReason: { type: 'STRING' },
          restReasonJa: { type: 'STRING' },
          prerequisites: { type: 'ARRAY', items: { type: 'STRING' } },
          resources: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: [
          'id',
          'title',
          'titleJa',
          'description',
          'descriptionJa',
          'hours',
          'week',
          'difficulty',
          'restAfter',
          'restReason',
          'restReasonJa',
          'prerequisites',
          'resources',
        ],
      },
    },
  },
  required: ['goalJa', 'summary', 'summaryJa', 'nodes'],
};

const quizSchema = {
  type: 'OBJECT',
  properties: {
    testDifficulty: { type: 'INTEGER' },
    restIfPassed: { type: 'BOOLEAN' },
    restAdvicePassed: { type: 'STRING' },
    restAdviceStruggled: { type: 'STRING' },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          q: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          answer: { type: 'INTEGER' },
          explanation: { type: 'STRING' },
        },
        required: ['q', 'options', 'answer', 'explanation'],
      },
    },
  },
  required: ['testDifficulty', 'restIfPassed', 'restAdvicePassed', 'restAdviceStruggled', 'questions'],
};

function buildPrompt({ goal, months, level, hoursPerDay }) {
  const totalHours = Math.round(months * 30 * hoursPerDay);
  const weeks = Math.max(1, Math.round(months * 4.3));
  return `You are an expert learning designer. Create a personalized learning roadmap as a knowledge graph (a "Knowledge Mountain") with BOTH English and natural Japanese fields so the UI can switch languages seamlessly.

Student profile:
- Learning goal: ${goal}
- Timeframe: ${months} month(s) (~${weeks} weeks)
- Current level: ${level}
- Study time: ${hoursPerDay} hours per day (~${totalHours} hours total)

Rules:
- Produce 10 to 16 topics.
- Order the array so every prerequisite appears EARLIER than the topic that needs it.
- Foundational topics have no prerequisites; they form the base of the mountain.
- The LAST topic is a capstone project that depends (directly or indirectly) on all major branches.
- ids are short kebab-case strings; prerequisites reference those ids.
- hours are realistic and sum to roughly ${totalHours}.
- week is the suggested week to start (1..${weeks}).
- difficulty is an integer from 1 (gentle intro) to 5 (steep, cognitively demanding test).
- Decide when the climber MUST rest based on test/topic difficulty: set restAfter=true on 3 topics (not the final capstone) where the concept/test is hardest (typically difficulty 4 or 5) and the student needs a recovery camp to consolidate before climbing higher. Set restReason (English) and restReasonJa (Japanese) to 1 sentence explaining why this test is demanding and why resting here helps. For all other topics set restAfter=false, restReason="", restReasonJa="".
- Provide title & description in English AND titleJa & descriptionJa in natural Japanese.
- resources: 2-3 well-known, preferably free resources by name.
- Condense or skip basics the student likely already knows at the "${level}" level.
- summary (English) and summaryJa (Japanese): 2 sentences describing the overall climb, encouraging tone.`;
}

async function generateWithGemini(input) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const parsed = JSON.parse(text);
  const roadmap = normalizeRoadmap({ ...parsed, source: 'ai' }, input);
  if (roadmap.nodes.length < 3) throw new Error('AI returned too few topics');
  return roadmap;
}

function fallbackQuiz({ title, description, difficulty = 3, lang = 'en' }) {
  const hard = difficulty >= 4;
  if (lang === 'ja') {
    return {
      source: 'demo',
      testDifficulty: difficulty,
      restIfPassed: hard,
      restAdvicePassed: hard
        ? `「${title}」は難易度 ${difficulty}/5 のハードなテストでした！学んだ知識を脳に定着させるため、AIキャンプで一休みしましょう。`
        : `「${title}」のテスト（難易度 ${difficulty}/5）突破おめでとうございます！まだ余力があるのでこのまま次のトピックへ登れます。`,
      restAdviceStruggled: `「${title}」（難易度 ${difficulty}/5）は手強いテストでした。次の急斜面へ進む前にキャンプで休憩して復習しましょう。`,
      questions: [
        {
          q: `「${title}」を学ぶ最も重要な目的は何ですか？`,
          options: [
            description || `「${title}」の核心概念を理解し、実践的に応用できるようにすること。`,
            '前提となる基礎をすべて飛ばして暗記だけで済ませること。',
            '手を動かさずに用語だけを一時的に覚えること。',
            '他のトピックとのつながりを意識せずに進めること。',
          ],
          answer: 0,
          explanation: `「${title}」の本質を理解することで、次のステージの応用トピックが解放されます。`,
        },
        {
          q: `「${title}」を本当に習得できたと言える状態はどれですか？`,
          options: [
            'なぜそうなるのかを自分の言葉で説明でき、初めての課題にも応用できる。',
            '解説を一度読んだだけで問題を解いていない。',
            'サンプルコードを意味を考えずにコピーしただけ。',
            '前提知識との関係を説明できない。',
          ],
          answer: 0,
          explanation: '原理の理解と自力での応用ができてこそ、本物の登破です。',
        },
      ],
    };
  }

  return {
    source: 'demo',
    testDifficulty: difficulty,
    restIfPassed: hard,
    restAdvicePassed: hard
      ? `That was a steep Level ${difficulty}/5 test on "${title}". AI recommends pitching camp and resting here so these concepts lock into long-term memory.`
      : `Nice work on "${title}"! The test was manageable (Difficulty ${difficulty}/5), so you have energy to keep climbing.`,
    restAdviceStruggled: `This test on "${title}" pushed your limits (Difficulty ${difficulty}/5). AI strongly advises resting at camp now to review before climbing higher.`,
    questions: [
      {
        q: `What is the primary role of "${title}" on your climb?`,
        options: [
          description || `Mastering the core concepts and practical application of ${title}.`,
          'Skipping prerequisite foundations entirely.',
          'Memorizing definitions without applying them to real problems.',
          'Avoiding hands-on practice until the final day.',
        ],
        answer: 0,
        explanation: `"${title}" builds essential capability for the next stage of your mountain.`,
      },
      {
        q: `When applying "${title}" in practice, what signals genuine mastery?`,
        options: [
          'Being able to explain why it works and solve an unseen problem with it.',
          'Reading the summary once without testing yourself.',
          'Copying an example without changing any inputs.',
          'Ignoring how it connects to earlier prerequisites.',
        ],
        answer: 0,
        explanation: 'True mastery means understanding both the intuition and how to apply it independently.',
      },
    ],
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: hasKey(), model: MODEL }));

app.post('/api/roadmap', async (req, res) => {
  const b = req.body || {};
  const input = {
    goal: String(b.goal || '').trim().slice(0, 120) || 'Artificial Intelligence',
    months: Math.min(24, Math.max(0.5, Number(b.months) || 3)),
    level: ['beginner', 'intermediate', 'advanced'].includes(b.level) ? b.level : 'beginner',
    hoursPerDay: Math.min(16, Math.max(0.25, Number(b.hoursPerDay) || 2)),
  };

  if (!hasKey()) return res.json(mockRoadmap(input));

  try {
    res.json(await generateWithGemini(input));
  } catch (err) {
    console.error('[roadmap] AI generation failed, using demo roadmap:', err.message);
    res.json({ ...mockRoadmap(input), warning: 'AI generation failed — showing a demo roadmap instead.' });
  }
});

app.post('/api/quiz', async (req, res) => {
  const b = req.body || {};
  const title = String(b.title || 'Topic').slice(0, 100);
  const description = String(b.description || '').slice(0, 400);
  const goal = String(b.goal || 'Learning Goal').slice(0, 100);
  const difficulty = Math.min(5, Math.max(1, Number(b.difficulty) || 3));
  const hoursSinceRest = Number(b.hoursSinceRest) || 0;
  const lang = b.lang === 'ja' ? 'ja' : 'en';

  if (!hasKey()) return res.json(fallbackQuiz({ title, description, difficulty, lang }));

  const langRule =
    lang === 'ja'
      ? 'Write all questions, options, explanations, restAdvicePassed, and restAdviceStruggled in natural Japanese.'
      : 'Write all questions, options, explanations, restAdvicePassed, and restAdviceStruggled in English.';

  const prompt = `Create a 2-question multiple-choice checkpoint test for a student climbing a "Knowledge Mountain" toward "${goal}".
Topic: "${title}"
Description: "${description}"
Expected difficulty: ${difficulty}/5 (1=easy, 5=very hard)
Hours studied since last rest stop: ${hoursSinceRest}h

Rules:
- ${langRule}
- Match the question rigor to difficulty ${difficulty}/5.
- Each question must have 4 concise options and answer (0..3).
- Set testDifficulty (1..5) to how hard this test actually is.
- Decide whether the student should rest after this test:
  - Set restIfPassed=true if testDifficulty >= 4 OR hoursSinceRest >= 35 (the test/stretch is tough enough that even passing warrants a recovery camp). Otherwise false.
  - Write restAdvicePassed (1 sentence from the AI Sherpa telling the student either why they earned a rest camp after this hard test, or why they're fresh enough to keep climbing).
  - Write restAdviceStruggled (1 sentence from the AI Sherpa recommending a rest stop to consolidate because the test was tricky).`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: quizSchema, temperature: 0.6 },
      }),
    });
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const parsed = JSON.parse(text);
    res.json({ ...parsed, source: 'ai' });
  } catch (err) {
    console.error('[quiz] AI quiz failed, using fallback:', err.message);
    res.json(fallbackQuiz({ title, description, difficulty, lang }));
  }
});

// Serve the production build if it exists (npm run build && npm start).
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Knowledge Mountain API on http://localhost:${PORT}  (${hasKey() ? `Gemini: ${MODEL}` : 'demo mode — no GEMINI_API_KEY'})`);
});
