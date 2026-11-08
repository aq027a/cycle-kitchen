// Everything is stored locally on the device (localStorage). No data leaves the phone.
const KEY = 'cyclekitchen:v1';

export function defaultState() {
  return {
    settings: {
      onboarded: false,
      name: '',
      lastPeriodStart: null, // 'YYYY-MM-DD'
      cycleLength: 28,
      periodLength: 5,
      diet: 'omni',
      avoidTags: [], // e.g. ['gluten']
      excluded: [], // ingredient ids the user doesn't like
      skipStaples: true, // keep salt, oil, spices off the list
      defaultServings: 2,
    },
    periodLog: [], // period start dates 'YYYY-MM-DD'
    favorites: [],
    savedIdeas: [], // Spoonacular ideas: only id, title & image (allowed by their terms)
    shopping: [],
  };
}

export function load() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  } catch {
    return base;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked – the app keeps working */
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
