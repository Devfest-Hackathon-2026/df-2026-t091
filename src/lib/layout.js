// Places knowledge-graph nodes on the mountain: graph level -> altitude,
// nodes at the same level are spread around the mountain along a spiral trail.
import { heightAt, radiusForHeightFraction, R } from './terrain.js';

export function layoutNodes(nodes) {
  const maxLevel = Math.max(0, ...nodes.map((n) => n.level));
  const byLevel = new Map();
  nodes.forEach((n) => {
    if (!byLevel.has(n.level)) byLevel.set(n.level, []);
    byLevel.get(n.level).push(n);
  });

  const positions = {};
  for (const [lvl, group] of byLevel) {
    const isSummit = lvl === maxLevel && group.length === 1 && maxLevel > 0;
    const frac = maxLevel === 0 ? 0.1 : 0.06 + 0.86 * (lvl / maxLevel);
    const r = isSummit ? 0.35 : Math.max(0.9, radiusForHeightFraction(frac));
    const baseAngle = lvl * 1.15 + 0.4;
    const step = Math.min(1.3, 2.2 / Math.max(r, 1)); // keep arc spacing roughly constant
    group.forEach((n, i) => {
      const a = baseAngle + (i - (group.length - 1) / 2) * step;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      positions[n.id] = [x, heightAt(x, z) + 0.28, z];
    });
  }
  return positions;
}

export function baseCampPosition() {
  const a = 0.4 - 0.9;
  const r = R * 0.98;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  return [x, heightAt(x, z), z];
}

/** Sample a trail between two points that hugs the terrain surface. */
export function trailPoints(a, b, segments = 28) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    pts.push([x, heightAt(x, z) + 0.12, z]);
  }
  return pts;
}

/**
 * Ground point at a fraction (0..1) of the scheduled climb, following topics in order.
 * `slices` come from scheduleSlices(); used for the pace climber and camp placement.
 */
export function pointAtFraction(f, slices, positions, camp) {
  if (f <= 0 || !slices.length) return camp;
  const i = slices.findIndex((s) => f < s.end);
  const idx = i === -1 || f >= 1 ? slices.length - 1 : i;
  const s = slices[idx];
  const from = idx === 0 ? camp : positions[slices[idx - 1].id];
  const to = positions[s.id];
  const t = f >= 1 ? 1 : (f - s.start) / (s.end - s.start || 1);
  const x = from[0] + (to[0] - from[0]) * t;
  const z = from[2] + (to[2] - from[2]) * t;
  return [x, heightAt(x, z), z];
}

/** Places AI resting camps right beside the hard topic node that triggered them. */
export function placeCamps(camps, slices, positions, baseCamp) {
  const nodePts = Object.values(positions);
  const out = {};
  camps.forEach((c, idx) => {
    const anchor = (c.nodeId && positions[c.nodeId]) || pointAtFraction(c.f, slices, positions, baseCamp);
    const r = Math.max(1.35, Math.hypot(anchor[0], anchor[2]));
    let a = Math.atan2(anchor[2], anchor[0]) + (idx % 2 === 0 ? 0.34 : -0.34);
    for (let step = 0; step < 10; step++) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (nodePts.every((np) => Math.hypot(np[0] - x, np[2] - z) > 0.92)) {
        out[c.id] = [x, heightAt(x, z), z];
        break;
      }
      a += 0.26;
    }
    if (!out[c.id]) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      out[c.id] = [x, heightAt(x, z), z];
    }
  });
  return out;
}
