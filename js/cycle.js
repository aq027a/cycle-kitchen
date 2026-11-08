// Zyklusberechnung (Schätzung auf Basis von letzter Periode + Zykluslänge).
// Eisprung ≈ 14 Tage vor der nächsten Periode.
import { PHASE_ORDER } from './data/phases.js';

const DAY_MS = 86400000;

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function daysBetween(a, b) {
  // Math.round gleicht Sommer-/Winterzeit-Sprünge aus
  return Math.round((b - a) / DAY_MS);
}

/** Tagesbereiche der Phasen (1-basiert, inklusive). Leere Phasen werden entfernt. */
export function phaseRanges(cycleLength, periodLength) {
  const ov = Math.max(periodLength + 2, cycleLength - 14);
  return [
    { id: 'menstruation', start: 1, end: periodLength },
    { id: 'follicular', start: periodLength + 1, end: ov - 2 },
    { id: 'ovulation', start: Math.max(ov - 1, periodLength + 1), end: ov + 1 },
    { id: 'luteal', start: ov + 2, end: cycleLength },
  ].filter((r) => r.start <= r.end);
}

export function phaseForDay(day, ranges) {
  return (ranges.find((r) => day >= r.start && day <= r.end) || ranges[ranges.length - 1]).id;
}

/**
 * Liefert alles, was die Heute-Ansicht braucht.
 * status: 'ok' | 'late' (Periode bis 7 Tage überfällig) | 'estimate' (länger nichts eingetragen)
 */
export function getCycleInfo(settings, now = today()) {
  const L = settings.cycleLength;
  const P = settings.periodLength;
  const ranges = phaseRanges(L, P);
  const start = parseDate(settings.lastPeriodStart);
  const diff = Math.max(0, daysBetween(start, now));
  const rawDay = diff + 1;

  let cycleDay = rawDay;
  let status = 'ok';
  let cycleStart = start;

  if (rawDay > L && rawDay - L <= 7) {
    status = 'late';
    cycleDay = L; // bleibt in der Lutealphase
  } else if (rawDay > L) {
    status = 'estimate';
    const cycles = Math.floor(diff / L);
    cycleStart = addDays(start, cycles * L);
    cycleDay = (diff % L) + 1;
  }

  const phaseId = phaseForDay(cycleDay, ranges);
  const range = ranges.find((r) => r.id === phaseId);
  const nextPeriod = addDays(cycleStart, L);

  let nextPhaseId, daysToNext;
  if (status === 'late') {
    nextPhaseId = 'menstruation';
    daysToNext = 0;
  } else {
    const idx = ranges.indexOf(range);
    const next = ranges[idx + 1];
    nextPhaseId = next ? next.id : 'menstruation';
    daysToNext = range.end + 1 - cycleDay;
  }

  return {
    cycleDay,
    displayDay: status === 'late' ? rawDay : cycleDay,
    lateBy: status === 'late' ? rawDay - L : 0,
    status,
    phaseId,
    ranges,
    cycleLength: L,
    nextPhaseId,
    daysToNext,
    nextPeriod,
    phaseIndex: PHASE_ORDER.indexOf(phaseId),
  };
}

/** Durchschnittliche Zykluslänge aus den letzten eingetragenen Periodenstarts (oder null). */
export function averageCycleLength(log) {
  const sorted = [...new Set(log)].sort();
  const lengths = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = daysBetween(parseDate(sorted[i - 1]), parseDate(sorted[i]));
    if (len >= 18 && len <= 45) lengths.push(len);
  }
  const recent = lengths.slice(-6);
  if (recent.length < 2) return null;
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}
