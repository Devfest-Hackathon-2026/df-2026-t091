// Time-based schedule & AI-driven resting camps based on topic/test difficulty.
import { ensureDifficultyAndRests } from '../../shared/normalize.js';

export const DAY = 86400000;

export const durationMs = (roadmap) => roadmap.months * 30 * DAY;

/** Each topic gets a slice of the timeline proportional to its hours (array order is prerequisite-safe). */
export function scheduleSlices(nodes) {
  const total = nodes.reduce((s, n) => s + n.hours, 0) || 1;
  let cum = 0;
  return nodes.map((n) => {
    const start = cum / total;
    cum += n.hours;
    return { id: n.id, start, end: cum / total };
  });
}

/** Simulated "now" for a clock that may be fast-forwarded for demos. */
export const simTime = (clock, realNow) => clock.anchorSim + (realNow - clock.anchorReal) * clock.speed;

export function newClock(now = Date.now()) {
  return { startedAt: now, anchorReal: now, anchorSim: now, speed: 1 };
}

export function splitDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Builds resting camps decided by AI based on topic & test difficulty.
 * `aiRestNotes` is a map of `{ [nodeId]: "AI reason why you need to rest after this test" }`.
 */
export function buildCamps(rawNodes, aiRestNotes = {}, lang = 'en') {
  const nodes = ensureDifficultyAndRests(rawNodes);
  const slices = scheduleSlices(nodes);
  const sliceById = Object.fromEntries(slices.map((s) => [s.id, s]));

  const out = [];
  nodes.forEach((n, idx) => {
    const isLast = idx === nodes.length - 1;
    const dynamicReason = aiRestNotes?.[n.id];
    if ((!n.restAfter && !dynamicReason) || (isLast && !dynamicReason)) return;
    const idxNum = out.length + 1;
    const num = ROMAN[out.length] || String(idxNum);
    const s = sliceById[n.id];
    const title = lang === 'ja' ? n.titleJa || n.title : n.title;
    const reason =
      dynamicReason ||
      (lang === 'ja'
        ? n.restReasonJa ||
          `「${title}」（難易度 ${n.difficulty}/5）の難関テスト突破後、知識を定着させるためAIが休憩キャンプを配置しました。`
        : n.restReason ||
          `AI scheduled a rest stop after "${title}" (Difficulty ${n.difficulty}/5) so your brain can consolidate before the next steep climb.`);
    out.push({
      id: `camp-${n.id}`,
      nodeId: n.id,
      nodeTitle: title,
      difficulty: n.difficulty || 4,
      name: lang === 'ja' ? `第${idxNum}キャンプ` : `Camp ${num}`,
      f: s ? s.end : (idx + 1) / nodes.length,
      dynamic: Boolean(dynamicReason && !n.restAfter),
      tagline: reason,
    });
  });
  return out;
}

export function isCampReached(camp, completedIds, progressFrac = 0) {
  if (camp.id === 'base') return true;
  const done = new Set(completedIds);
  return (camp.nodeId && done.has(camp.nodeId)) || progressFrac >= camp.f;
}

export function hoursProgress(nodes, completedIds) {
  const done = new Set(completedIds);
  const total = nodes.reduce((s, n) => s + n.hours, 0) || 1;
  const doneHours = nodes.filter((n) => done.has(n.id)).reduce((s, n) => s + n.hours, 0);
  return { total, doneHours, frac: doneHours / total };
}
