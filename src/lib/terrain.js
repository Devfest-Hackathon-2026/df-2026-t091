// Procedural mountain height field, distant range, and slope/altitude-aware coloring.
export const R = 10; // base radius of the main mountain
export const H = 7.5; // summit height
const EXP = 1.5; // profile exponent (gentle foothills, steep near the top)
export const GROUND_Y = -0.3;
export const MAIN_HALF = 15; // half-size of the main terrain tile

function hash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y) {
  let s = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 5; i++) {
    s += amp * vnoise(x * f, y * f);
    f *= 2.02;
    amp *= 0.5;
  }
  return s; // ~0..0.97
}
/** Ridged multifractal: sharp crests like real alpine ridgelines. */
function ridged(x, y) {
  let s = 0, amp = 0.5, f = 1, prev = 1;
  for (let i = 0; i < 5; i++) {
    let n = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1);
    n *= n;
    s += n * amp * prev;
    prev = n;
    f *= 2.03;
    amp *= 0.5;
  }
  return s; // ~0..1
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const t = Math.max(0, 1 - r / R);
  // Domain warp so ridges meander naturally.
  const wx = x + (fbm(x * 0.2 + 3, z * 0.2 + 7) - 0.45) * 3;
  const wz = z + (fbm(x * 0.2 + 11, z * 0.2 + 1) - 0.45) * 3;
  const ang = Math.atan2(wz, wx);

  let h = H * Math.pow(t, EXP);
  h += t * (0.3 + 0.7 * t) * (ridged(wx * 0.28, wz * 0.28) - 0.35) * 1.8; // crests & gullies
  h += Math.pow(t, 1.2) * Math.sin(ang * 4 + r * 0.3) * 0.4; // radial spurs
  h += (fbm(x * 0.18, z * 0.18) - 0.45) * 0.9 * (1 - t); // rolling foothills

  // Blend to flat valley floor at the tile edge so it meets the distant range seamlessly.
  const edge = smooth(MAIN_HALF - 3, MAIN_HALF - 0.2, Math.max(Math.abs(x), Math.abs(z)));
  return Math.max(GROUND_Y, h * (1 - edge) + GROUND_Y * edge);
}

/** Surrounding mountain range (outside the main tile). */
export function rangeHeight(x, z) {
  const r = Math.hypot(x, z);
  const band = smooth(24, 55, r);
  if (band <= 0) return GROUND_Y;
  const peaks = ridged(x * 0.035 + 50, z * 0.035 + 50) * 26 + fbm(x * 0.08, z * 0.08) * 6;
  return GROUND_Y + band * peaks;
}

/** Ground height anywhere in the world. */
export const groundAt = (x, z) =>
  Math.max(Math.abs(x), Math.abs(z)) < MAIN_HALF ? heightAt(x, z) : rangeHeight(x, z);

/** Approximate slope (0 = flat, 1 = vertical-ish). */
export function slopeAt(x, z, e = 0.15) {
  const dx = groundAt(x + e, z) - groundAt(x - e, z);
  const dz = groundAt(x, z + e) - groundAt(x, z - e);
  const ny = 1 / Math.hypot(dx / (2 * e), 1, dz / (2 * e));
  return 1 - ny;
}

/** Radius on the ideal profile that corresponds to a given height fraction (0..1). */
export function radiusForHeightFraction(f) {
  const t = Math.pow(Math.min(1, Math.max(0, f)), 1 / EXP);
  return R * (1 - t);
}

const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const MEADOW = [0.27, 0.42, 0.21];
const FOREST = [0.15, 0.28, 0.15];
const ALPINE = [0.44, 0.45, 0.31];
const ROCK = [0.45, 0.41, 0.37];
const DARK_ROCK = [0.28, 0.26, 0.25];
const SNOW = [0.95, 0.97, 1.0];

/** Color from altitude, slope (1 - normal.y) and world position (for noise breakup). */
export function surfaceColor(y, slope, x, z, snowLine = 4.4) {
  const n = fbm(x * 0.9 + 100, z * 0.9) - 0.45;
  let c = mix(MEADOW, FOREST, smooth(0.0, 1.0, y + n * 2) * (1 - smooth(1.6, 2.4, y)));
  c = mix(c, ALPINE, smooth(1.6, 3.0, y + n * 1.5));
  c = mix(c, ROCK, smooth(2.8, 3.9, y + n * 1.2));
  c = mix(c, DARK_ROCK, smooth(0.32, 0.6, slope + n * 0.25) * 0.85);
  const snow = smooth(snowLine, snowLine + 0.7, y + n * 1.8) * (1 - smooth(0.45, 0.72, slope + n * 0.1));
  return mix(c, SNOW, snow);
}
