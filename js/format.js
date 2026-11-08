// Small helpers for display & safety

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const PLURAL = { can: 'cans', clove: 'cloves', slice: 'slices', bunch: 'bunches', handful: 'handfuls' };
const FINE_UNITS = new Set(['tbsp', 'tsp', 'bunch']);
// Things you can only buy whole → round up on the shopping list
const WHOLE_UNITS = new Set(['', 'can', 'clove', 'bunch', 'slice']);

function niceNumber(v, step) {
  let r = Math.round(v / step) * step;
  if (r === 0) r = step;
  const whole = Math.floor(r);
  const frac = +(r - whole).toFixed(2);
  if (frac === 0) return String(whole);
  const f = FRACTIONS[frac];
  if (f) return whole ? `${whole}${f}` : f;
  return String(r);
}

/**
 * Formats amount + unit, e.g. "1½ cans", "250 g", "2 tbsp", "2".
 * shopping=true rounds whole items up (2½ onions → 3).
 */
export function fmtAmount(amount, unit, shopping = false) {
  if (amount == null) return shopping ? '' : 'to taste';
  if (shopping && WHOLE_UNITS.has(unit)) amount = Math.ceil(amount - 0.01);
  let num;
  if (unit === 'g' || unit === 'ml') {
    const step = amount >= 100 ? 10 : 5;
    num = String(Math.max(step, Math.round(amount / step) * step));
  } else {
    num = niceNumber(amount, FINE_UNITS.has(unit) ? 0.25 : 0.5);
  }
  if (!unit) return num;
  const label = amount > 1.01 && PLURAL[unit] ? PLURAL[unit] : unit;
  return `${num} ${label}`;
}

export function fmtDate(date, opts = { month: 'long', day: 'numeric' }) {
  return date.toLocaleDateString('en-US', opts);
}

export function inDays(n) {
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in about ${n} days`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
