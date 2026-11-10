// Client-side direct Gemini API fallback (used when deployed on static hosting without a Node backend)
import { normalizeRoadmap } from '../../shared/normalize.js';

export const getClientApiKey = () =>
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY?.trim()) ||
  localStorage.getItem('user_gemini_key') ||
  '';

const MODEL = 'gemini-2.5-flash';

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

export async function generateRoadmapClient(input) {
  const apiKey = getClientApiKey();
  if (!apiKey) throw new Error('No API key available');

  const totalHours = Math.round(input.months * 30 * input.hoursPerDay);
  const weeks = Math.max(1, Math.round(input.months * 4.3));
  const prompt = `You are an expert learning designer. Create a personalized learning roadmap as a knowledge graph (a "Knowledge Mountain") with BOTH English and natural Japanese fields.
Student profile:
- Goal: ${input.goal}
- Timeframe: ${input.months} month(s) (~${weeks} weeks)
- Level: ${input.level}
- Study time: ${input.hoursPerDay} hours per day (~${totalHours} hours total)

Rules:
- 10 to 16 topics.
- Every prerequisite appears EARLIER than the topic that needs it.
- Difficulty 1..5. Set restAfter=true on 3 hardest topics (test difficulty 4 or 5) for recovery camps.
- Provide title, description, restReason in English AND titleJa, descriptionJa, restReasonJa in Japanese.
- The last topic is a capstone project.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.7 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  const parsed = JSON.parse(text);
  return normalizeRoadmap({ ...parsed, source: 'ai' }, input);
}
