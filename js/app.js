import { PHASES, PHASE_ORDER } from './data/phases.js';
import { INGREDIENTS, ING, CATEGORIES, COMMON_DISLIKES, DIETS, AVOID_TAGS } from './data/ingredients.js';
import { RECIPES } from './data/recipes.js';
import * as store from './store.js';
import { getCycleInfo, today, toISO, parseDate, averageCycleLength } from './cycle.js';
import { esc, fmtAmount, fmtDate, inDays, uid, normalize } from './format.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const toastEl = document.getElementById('toast');
const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
const MEALS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

let state = store.load();
// Drop saved recipes that no longer exist (e.g. after the recipe set changed)
state.favorites = state.favorites.filter((id) => RECIPE_BY_ID[id]);

// Transient UI state (not saved)
const ui = {
  recipePhase: 'now', // 'now' | phase id | 'all' | 'saved'
  meal: 'all',
  search: '',
  dislikeSearch: '',
  servings: {}, // recipeId → servings
  unchecked: {}, // recipeId → Set(ingredientId) NOT to add to the list
  recipeTab: 'ing',
  obStep: 0, // 0 welcome, 1 period, 2 diet, 3 dislikes
  draft: null, // onboarding draft settings
  cal: null, // { y, m } calendar month in onboarding
};

function commit() {
  store.save(state);
  updateBadge();
}

// ───────────────────────── Icons ─────────────────────────

const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
  bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5V20"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z"/>',
  breakfast: '<path d="M4 9h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3.5c0 1.2-.8 1.6-.8 2.8M12 3.5c0 1.2-.8 1.6-.8 2.8"/>',
  lunch: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M9 7.5c0-1.2.8-1.6.8-2.8M13 7.5c0-1.2.8-1.6.8-2.8"/>',
  dinner: '<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h2M20 10h2M9 6.5h6M12 4v2.5"/>',
  snack: '<path d="M12 7.5c-1.6-1.2-5-1.4-6.4 1.4-1.5 3-.4 7.3 1.9 10 1.3 1.5 2.8 1.2 4.5.5 1.7.7 3.2 1 4.5-.5 2.3-2.7 3.4-7 1.9-10-1.4-2.8-4.8-2.6-6.4-1.4z"/><path d="M12 7.5c0-1.8.8-3 2.5-3.5"/>',
};

function icon(name, size = 20, cls = '') {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
}

const LOGO = `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2a12 12 0 0 1 12 12H14z" fill="#C4554B"/><path d="M26 14a12 12 0 0 1-12 12V14z" fill="#7FA33A"/><path d="M14 26A12 12 0 0 1 2 14h12z" fill="#D9A21E"/><path d="M2 14A12 12 0 0 1 14 2v12z" fill="#7B6BC0"/><circle cx="14" cy="14" r="5" fill="#F5F4EF"/></svg>`;

// ───────────────────────── Filter logic ─────────────────────────

function forbiddenTags() {
  return new Set([...DIETS[state.settings.diet].forbidden, ...state.settings.avoidTags]);
}

/** Checks a recipe against diet, intolerances and dislikes. */
function evaluate(recipe) {
  const forb = forbiddenTags();
  const excl = new Set(state.settings.excluded);
  const omitted = [];
  for (const [id, , , opts = {}] of recipe.ingredients) {
    const bad = excl.has(id) || ING[id].tags.some((t) => forb.has(t));
    if (!bad) continue;
    if (opts.optional) omitted.push(id);
    else return { ok: false, blocker: id, omitted };
  }
  return { ok: true, omitted };
}

function ingredientAllowed(id) {
  const forb = forbiddenTags();
  return !state.settings.excluded.includes(id) && !ING[id].tags.some((t) => forb.has(t));
}

function dietLabel(recipe, omitted = []) {
  const tags = new Set(recipe.ingredients.filter(([id]) => !omitted.includes(id)).flatMap(([id]) => ING[id].tags));
  if (tags.has('meat')) return 'With meat';
  if (tags.has('fish')) return 'With fish';
  if (['dairy', 'egg', 'honey'].some((t) => tags.has(t))) return 'Vegetarian';
  return 'Vegan';
}

function hasMeat(r) {
  return r.ingredients.some(([id]) => ING[id].tags.includes('meat'));
}

/** Flexitarians see plant-based recipes first. */
function plantsFirst(list) {
  if (!DIETS[state.settings.diet].preferPlants) return list;
  return [...list.filter((r) => !hasMeat(r)), ...list.filter(hasMeat)];
}

function visibleRecipes() {
  return RECIPES.filter((r) => evaluate(r).ok);
}

function cycleInfo() {
  return getCycleInfo(state.settings);
}

function dietSummary() {
  const s = state.settings;
  const parts = [DIETS[s.diet].name, ...s.avoidTags.map((t) => AVOID_TAGS[t].toLowerCase())];
  const names = s.excluded.map((id) => ING[id].name.toLowerCase());
  if (names.length) parts.push('no ' + (names.length > 3 ? names.slice(0, 3).join(', ') + ` +${names.length - 3}` : names.join(', ')));
  return parts.join(' · ');
}

// ───────────────────────── Router ─────────────────────────

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, query] = hash.split('?');
  const [name = '', arg] = path.split('/');
  return { name, arg, params: new URLSearchParams(query || '') };
}

function render() {
  if (!state.settings.onboarded) {
    nav.hidden = true;
    app.className = 'app full';
    viewOnboarding();
    return;
  }
  const { name, arg, params } = parseRoute();
  const views = { '': viewToday, phase: viewPhase, recipes: viewRecipes, recipe: viewRecipe, list: viewList, settings: viewSettings };
  const view = views[name] ? name : '';
  const withNav = ['', 'recipes', 'list'].includes(view);
  nav.hidden = !withNav;
  app.className = withNav ? 'app with-nav' : 'app';
  views[view](arg, params);
  const active = view || 'today';
  nav.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === active;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  updateBadge();
}

function updateBadge() {
  const badge = document.getElementById('listBadge');
  const open = state.shopping.filter((i) => !i.checked).length;
  badge.hidden = open === 0;
  badge.textContent = open > 99 ? '99+' : open;
}

// ───────────────────────── Building blocks ─────────────────────────

function phaseVars(id) {
  const p = PHASES[id];
  return `--tint:${p.tint};--dot:${p.dot}`;
}

function stepper(field, value, min, max, label, ariaLess, ariaMore) {
  return `
    <div class="stepper">
      <button type="button" class="step-btn" data-act="step" data-field="${field}" data-delta="-1" data-min="${min}" data-max="${max}" aria-label="${ariaLess}" ${value <= min ? 'disabled' : ''}>${icon('minus', 18)}</button>
      <span class="step-val">${esc(label)}</span>
      <button type="button" class="step-btn" data-act="step" data-field="${field}" data-delta="1" data-min="${min}" data-max="${max}" aria-label="${ariaMore}" ${value >= max ? 'disabled' : ''}>${icon('plus', 18)}</button>
    </div>`;
}

/** Embedded photo from the original recipe; removes itself if it can't load (offline etc.),
 *  so the colored meal icon underneath shows instead. */
function photo(r, w, h, alt = '') {
  if (!r.image) return '';
  const src = `${r.image}?quality=80&resize=${w},${h}`;
  return `<img class="photo" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" onerror="this.remove()">`;
}

function recipeRow(r) {
  const ev = evaluate(r);
  const fav = state.favorites.includes(r.id);
  return `
    <a class="rrow" href="#/recipe/${r.id}">
      <span class="rthumb" style="${phaseVars(r.phases[0])}">${icon(r.meal, 26)}${photo(r, 200, 200)}</span>
      <span class="rrow-body">
        <span class="rtitle">${esc(r.title)}</span>
        <span class="rrow-meta"><span>${MEALS[r.meal]} · ${r.time} min</span><span class="tag">${esc(r.tag)}</span></span>
        <span class="rrow-sub">${dietLabel(r, ev.omitted)}${r.source ? ' · ' + esc(r.source.name) : ''}${fav ? ' · <span class="saved">♥ Saved</span>' : ''}</span>
      </span>
      ${icon('chevron', 20, 'muted')}
    </a>`;
}

function recipeBigCard(r, phaseId) {
  const ev = evaluate(r);
  return `
    <a class="rcard" href="#/recipe/${r.id}">
      <span class="rcard-img" style="${phaseVars(r.phases[0])}">
        ${icon(r.meal, 44)}
        ${photo(r, 800, 450)}
        <span class="img-badge">${esc(PHASES[phaseId].forLabel)}</span>
      </span>
      <span class="rcard-body">
        <span class="rtitle big">${esc(r.title)}</span>
        <span class="meta">
          <span class="meta-i">${icon('clock', 16)}${r.time} min</span>
          <span>${esc(servingsLabel(r, recipeServings(r)))}</span>
          <span>${dietLabel(r, ev.omitted)}</span>
        </span>
        ${r.source ? `<span class="source-line">Recipe from ${esc(r.source.name)}</span>` : ''}
      </span>
    </a>`;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => (toastEl.hidden = true), 250);
  }, 2400);
}

function confirmDialog(text, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.innerHTML = `
      <p>${esc(text)}</p>
      <div class="dialog-actions">
        <button class="btn ghost" value="cancel">Cancel</button>
        <button class="btn ${danger ? 'danger' : 'dark'}" value="ok">${esc(okLabel)}</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) dlg.close(b.value);
      else if (e.target === dlg) dlg.close('cancel');
    });
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok');
      dlg.remove();
    });
    dlg.showModal();
  });
}

function backBtn(href, label = 'Back') {
  return `<a class="circle-btn" href="${href}" aria-label="${label}">${icon('back', 20)}</a>`;
}

// ───────────────────────── Today ─────────────────────────

function pickForToday(phaseId, cycleDay) {
  const list = plantsFirst(visibleRecipes().filter((r) => r.phases.includes(phaseId)));
  const primary = list.filter((r) => r.phases[0] === phaseId);
  const secondary = list.filter((r) => r.phases[0] !== phaseId);
  const rotate = (arr) => (arr.length ? arr.slice(cycleDay % arr.length).concat(arr.slice(0, cycleDay % arr.length)) : arr);
  const ordered = [...rotate(primary), ...rotate(secondary)];
  // Lead with the meal that fits the time of day
  const h = new Date().getHours();
  const mealNow = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
  const lead = ordered.find((r) => r.meal === mealNow) || ordered[0];
  const rest = ordered.filter((r) => r !== lead);
  const picks = [];
  for (const meal of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const r = rest.find((x) => x.meal === meal && !picks.includes(x));
    if (r && picks.length < 3) picks.push(r);
  }
  return { lead, more: picks };
}

function cycleBar(info) {
  const L = info.cycleLength;
  const segs = info.ranges
    .map((r) => `<i class="${r.id === info.phaseId ? 'on' : ''}" style="flex:${r.end - r.start + 1}"></i>`)
    .join('');
  const pos = Math.min(98, Math.max(2, ((info.cycleDay - 0.5) / L) * 100));
  return `<div class="cycle-bar" aria-hidden="true"><div class="segs">${segs}</div><span class="marker" style="left:${pos}%"></span></div>`;
}

function viewToday() {
  const s = state.settings;
  const info = cycleInfo();
  const ph = PHASES[info.phaseId];
  const { lead, more } = pickForToday(ph.id, info.cycleDay);

  let nextLine;
  if (info.status === 'late') nextLine = `Your period is ${info.lateBy} ${info.lateBy === 1 ? 'day' : 'days'} late`;
  else if (info.nextPhaseId === 'menstruation') nextLine = `Next period ${inDays(info.daysToNext)} · ${fmtDate(info.nextPeriod, { month: 'short', day: 'numeric' })}`;
  else nextLine = `${PHASES[info.nextPhaseId].name} ${inDays(info.daysToNext)}`;

  const banner =
    info.status === 'estimate'
      ? `<div class="banner">You haven't logged a period in a while, so your phase is an estimate. <a href="#/settings">Update your last period</a></div>`
      : '';

  const initial = (s.name || '').trim().charAt(0).toUpperCase();

  app.innerHTML = `
    <header class="hello">
      <a class="avatar" href="#/settings" aria-label="Settings">${initial ? esc(initial) : icon('sliders', 20)}</a>
      <span class="hello-text">
        <span class="hello-name">Hi${s.name ? ' ' + esc(s.name.trim()) : ' there'}</span>
        <span class="hello-date">${fmtDate(today(), { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </span>
    </header>
    ${banner}
    <section class="phase-hero" style="${phaseVars(ph.id)}">
      <div class="row between">
        <span class="pill-soft"><i class="dot"></i>${esc(ph.name)}</span>
        <span class="small-ink">Day ${info.displayDay} of ${info.cycleLength}</span>
      </div>
      <h2 class="hero-title">${esc(ph.headline)}</h2>
      <p class="hero-text">${esc(ph.intro)}</p>
      ${cycleBar(info)}
      <span class="small-ink">${esc(nextLine)}</span>
      <a class="white-cta" href="#/phase">
        <span>What's good for you now</span>
        <span class="cta-dot">${icon('arrow', 18)}</span>
      </a>
    </section>

    <div class="section-head">
      <h2>Recommended today</h2>
      <a href="#/recipes" data-act="recipes-now">All recipes</a>
    </div>
    ${
      lead
        ? `${recipeBigCard(lead, ph.id)}<div class="rlist">${more.map(recipeRow).join('')}</div>`
        : `<div class="empty">No recipe for this phase fits your settings yet. <a href="#/settings">Adjust settings</a></div>`
    }

    <button class="period-btn" data-act="log-period">${icon('drop', 20)}<span>${info.status === 'late' ? 'My period started' : 'My period started today'}</span></button>
    <p class="fineprint center">Phases are estimated from your entries. Not a method of contraception.</p>
  `;
}

function logPeriod(iso) {
  const s = state.settings;
  const log = new Set(state.periodLog);
  if (s.lastPeriodStart) log.add(s.lastPeriodStart);
  log.add(iso);
  state.periodLog = [...log].sort();
  s.lastPeriodStart = iso;
  const avg = averageCycleLength(state.periodLog);
  let msg = 'Logged. New cycle, day 1.';
  if (avg && avg !== s.cycleLength) {
    s.cycleLength = avg;
    msg = `Logged. Cycle length updated to ${avg} days.`;
  }
  commit();
  render();
  toast(msg);
}

// ───────────────────────── What's good now (phase) ─────────────────────────

function onListFor(ingId) {
  return state.shopping.filter((i) => i.ingId === ingId && !i.checked);
}

function viewPhase(arg) {
  const info = cycleInfo();
  const current = info.phaseId;
  const key = PHASES[arg] ? arg : current;
  const ranges = Object.fromEntries(info.ranges.map((r) => [r.id, r]));
  const d = PHASES[key];

  const tabs = PHASE_ORDER.map((p) => {
    const on = p === key;
    const r = ranges[p];
    const days = r ? `Day ${r.start}–${r.end}` : '–';
    return `<button type="button" class="phase-tab ${on ? 'on' : ''}" style="${phaseVars(p)}" aria-pressed="${on}" data-act="phase-tab" data-phase="${p}">
      <span class="pt-label">${esc(PHASES[p].short)}</span><span class="pt-days">${days}</span></button>`;
  }).join('');

  const foods = d.foods.filter(([id]) => ingredientAllowed(id)).slice(0, 6);
  const rows = foods
    .map(([id, why]) => {
      const added = onListFor(id).length > 0;
      const name = ING[id].name.replace(/ \(.*\)$/, '');
      return `
        <div class="food-row">
          <span class="food-text"><span class="food-name">${esc(name)}</span><span class="food-why">${esc(why)}</span></span>
          <button type="button" class="round-toggle ${added ? 'on' : ''}" aria-pressed="${added}" data-act="food-toggle" data-id="${id}"
            aria-label="${added ? 'Remove' : 'Add'} ${esc(name)} ${added ? 'from' : 'to'} shopping list">${icon(added ? 'check' : 'plus', 20)}</button>
        </div>`;
    })
    .join('');

  const openCount = state.shopping.filter((i) => !i.checked).length;

  app.innerHTML = `
    <div class="topbar">
      ${backBtn('#/', 'Back to Today')}
      <h1 class="title-sm">What's good for you now</h1>
    </div>
    <div class="phase-tabs" role="group" aria-label="Choose a cycle phase">${tabs}</div>
    <section class="tint-card" style="${phaseVars(key)}">
      <div class="row between">
        <h2>${esc(d.title)}</h2>
        ${key === current ? '<span class="pill-white">Your phase</span>' : ''}
      </div>
      <p>${esc(d.about)}</p>
    </section>
    <div class="white-card food-list">${rows || '<p class="fineprint pad">Nothing here fits your settings.</p>'}</div>
    <div class="tip-card">${icon('bulb', 20)}<p>${esc(d.tip)}</p></div>
    <p class="fineprint">Matched to your diet. General nutrition tips – not a substitute for medical advice.</p>
    <div class="spacer"></div>
    <div class="bottom-actions">
      <a class="circle-btn big" href="#/list" aria-label="Open shopping list${openCount ? ', ' + openCount + ' items' : ''}">
        ${icon('bag', 24)}${openCount ? `<span class="count-badge" aria-hidden="true">${openCount}</span>` : ''}
      </a>
      <a class="dark-cta" href="#/recipes" data-act="recipes-phase" data-phase="${key}">${esc(d.cta)}</a>
    </div>
  `;
}

function toggleFood(id) {
  const tip = state.shopping.find((i) => i.key === `${id}|tip` && !i.checked);
  if (tip) {
    state.shopping = state.shopping.filter((i) => i !== tip);
  } else if (onListFor(id).length) {
    toast('Already on your list from a recipe');
    return;
  } else {
    const ing = ING[id];
    state.shopping.push({ id: uid(), key: `${id}|tip`, ingId: id, name: ing.name, amount: null, unit: '', cat: ing.cat, checked: false, sources: ['phase tip'] });
    toast(`${ing.name.replace(/ \(.*\)$/, '')} added to your list`);
  }
  commit();
  render();
}

// ───────────────────────── Recipes ─────────────────────────

function filteredRecipes() {
  const f = ui.recipePhase;
  const phase = f === 'now' ? cycleInfo().phaseId : PHASES[f] ? f : null;
  let base = RECIPES;
  if (phase) base = base.filter((r) => r.phases.includes(phase));
  if (f === 'saved') base = base.filter((r) => state.favorites.includes(r.id));
  if (ui.meal !== 'all') base = base.filter((r) => r.meal === ui.meal);
  const q = normalize(ui.search.trim());
  if (q) {
    base = base.filter(
      (r) =>
        normalize(r.title).includes(q) ||
        normalize(r.tag).includes(q) ||
        r.ingredients.some(([id]) => normalize(ING[id].name).includes(q) || (ING[id].alt || []).some((a) => normalize(a).includes(q)))
    );
  }
  let visible = base.filter((r) => evaluate(r).ok);
  if (phase) visible.sort((a, b) => (b.phases[0] === phase) - (a.phases[0] === phase));
  visible = plantsFirst(visible);
  return { visible, hidden: base.length - visible.length };
}

function renderRecipeResults() {
  const el = document.getElementById('results');
  if (!el) return;
  const { visible, hidden } = filteredRecipes();
  const hiddenNote = hidden
    ? `<p class="fineprint">${hidden} ${hidden === 1 ? 'recipe is' : 'recipes are'} hidden because ${hidden === 1 ? 'it doesn’t' : 'they don’t'} fit your <a href="#/settings">settings</a>.</p>`
    : '';
  let empty = 'No recipes found.';
  if (ui.recipePhase === 'saved' && !ui.search) empty = 'No saved recipes yet. Tap the heart on a recipe to keep it here.';
  el.innerHTML = visible.length
    ? `<div class="rlist">${visible.map(recipeRow).join('')}</div>${hiddenNote}`
    : `<div class="empty">${empty}</div>${hiddenNote}`;
}

function mealChips() {
  return ['all', 'breakfast', 'lunch', 'dinner', 'snack']
    .map((m) => {
      const on = ui.meal === m;
      return `<button type="button" class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="meal" data-meal="${m}">${m === 'all' ? 'All' : MEALS[m]}</button>`;
    })
    .join('');
}

function phaseSelect() {
  const cur = cycleInfo().phaseId;
  const v = ui.recipePhase;
  const tintId = v === 'now' ? cur : PHASES[v] ? v : null;
  const opts = [
    ['now', PHASES[cur].forLabel],
    ...PHASE_ORDER.filter((p) => p !== cur).map((p) => [p, PHASES[p].name]),
    ['all', 'All phases'],
    ['saved', 'Saved recipes'],
  ];
  return `
    <label class="phase-select ${tintId ? '' : 'neutral'}" style="${tintId ? phaseVars(tintId) : ''}">
      <i class="dot" aria-hidden="true"></i>
      <span class="sr-only">Show recipes for</span>
      <select data-change="recipe-phase">
        ${opts.map(([val, label]) => `<option value="${val}" ${val === v ? 'selected' : ''}>${esc(label)}</option>`).join('')}
      </select>
      ${icon('down', 16)}
    </label>`;
}

function viewRecipes(arg, params) {
  if (params.get('phase')) ui.recipePhase = params.get('phase');
  app.innerHTML = `
    <h1 class="page-title">Recipes</h1>
    ${phaseSelect()}
    <label class="search">
      ${icon('search', 20, 'muted')}
      <span class="sr-only">Search</span>
      <input type="search" placeholder="Search recipes or ingredients" value="${esc(ui.search)}" data-input="recipe-search" autocomplete="off" enterkeyhint="search">
    </label>
    <a class="diet-row" href="#/settings">
      ${icon('sliders', 18, 'muted')}
      <span class="diet-text">${esc(dietSummary())}</span>
      <span class="edit">Edit</span>
    </a>
    <div class="chips scroll-x" id="mealChips" role="group" aria-label="Filter by meal">${mealChips()}</div>
    <div id="results"></div>
  `;
  renderRecipeResults();
}

// ───────────────────────── Recipe detail ─────────────────────────

/** Batch recipes (e.g. energy balls) start at their original yield; meals at the user's default. */
function recipeServings(r) {
  return ui.servings[r.id] ?? (r.batch ? r.servings : state.settings.defaultServings ?? r.servings);
}

function servingsLabel(r, n) {
  const [one, many] = r.batch?.noun || ['serving', 'servings'];
  return `${n} ${n === 1 ? one : many}`;
}

function servingsMax(r) {
  return r.batch ? r.servings * 3 : 8;
}

function viewRecipe(id) {
  const r = RECIPE_BY_ID[id];
  if (!r) {
    app.innerHTML = `<div class="topbar">${backBtn('#/recipes')}</div><div class="empty">Recipe not found.</div>`;
    return;
  }
  const ev = evaluate(r);
  const servings = recipeServings(r);
  const factor = servings / r.servings;
  if (!ui.unchecked[id]) {
    ui.unchecked[id] = new Set(state.settings.skipStaples ? r.ingredients.filter(([iid]) => ING[iid].staple).map(([iid]) => iid) : []);
  }
  const unchecked = ui.unchecked[id];
  const fav = state.favorites.includes(id);
  const selectedCount = r.ingredients.filter(([iid]) => !ev.omitted.includes(iid) && !unchecked.has(iid)).length;

  const ingRows = r.ingredients
    .map(([iid, amount, unit, opts = {}]) => {
      const ing = ING[iid];
      const amt = fmtAmount(amount == null ? null : amount * factor, unit);
      if (ev.omitted.includes(iid)) {
        return `<li class="ing-row omitted"><span class="ing-name"><s>${esc(ing.name)}</s><small>left out</small></span><span class="ing-amt">${esc(amt)}</span></li>`;
      }
      return `
        <li class="ing-row">
          <label>
            <input type="checkbox" class="round-check" data-change="ing-toggle" data-recipe="${id}" data-id="${iid}" ${unchecked.has(iid) ? '' : 'checked'}>
            <span class="ing-name">${esc(ing.name)}${opts.optional ? '<small>optional</small>' : ''}</span>
            <span class="ing-amt">${esc(amt)}</span>
          </label>
        </li>`;
    })
    .join('');

  const steps = r.steps.map((s, i) => `<li><span class="step-n">${i + 1}</span><span>${esc(s)}</span></li>`).join('');
  const isIng = ui.recipeTab === 'ing';

  app.innerHTML = `
    <div class="hero-img" style="${phaseVars(r.phases[0])}">
      <button class="circle-btn on-img" data-act="back" aria-label="Back to recipes">${icon('back', 20)}</button>
      <button class="circle-btn on-img fav ${fav ? 'on' : ''}" data-act="fav" data-id="${id}" aria-pressed="${fav}" aria-label="Save recipe">${icon('heart', 20)}</button>
      ${icon(r.meal, 72)}
      ${photo(r, 800, 600, r.title)}
      ${r.image && r.source ? `<a class="photo-credit" href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">Photo: ${esc(r.source.name)}</a>` : ''}
    </div>
    <div class="sheet">
      <h1 class="recipe-title">${esc(r.title)}</h1>
      <div class="row between wrap">
        <span class="meta">
          <span class="meta-i">${icon('clock', 16)}${r.time} min</span>
          <span>${dietLabel(r, ev.omitted)}</span>
        </span>
        ${stepper('servings', servings, 1, servingsMax(r), servingsLabel(r, servings), 'Fewer', 'More')}
      </div>
      ${!ev.ok ? `<div class="banner">This doesn't fit your settings because it contains <b>${esc(ING[ev.blocker].name)}</b>.</div>` : ''}
      <div class="why-card">
        <span class="why-label">Why now?</span>
        <span>${esc(r.why)}</span>
        <span class="phase-dots">${r.phases.map((p) => `<span class="mini-pill" style="${phaseVars(p)}"><i class="dot"></i>${esc(PHASES[p].short)}</span>`).join('')}</span>
      </div>
      ${
        r.source
          ? `<a class="source-card" href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">
              <span class="source-text">
                <span class="source-title">View original with photos</span>
                <span class="source-sub">Recipe from ${esc(r.source.name)}</span>
              </span>
              <span class="cta-dot">${icon('external', 18)}</span>
            </a>`
          : ''
      }
      <div class="tabs" role="tablist" aria-label="Recipe view">
        <button type="button" role="tab" aria-selected="${isIng}" class="${isIng ? 'on' : ''}" data-act="recipe-tab" data-tab="ing">Ingredients</button>
        <button type="button" role="tab" aria-selected="${!isIng}" class="${!isIng ? 'on' : ''}" data-act="recipe-tab" data-tab="steps">Method</button>
      </div>
      ${
        isIng
          ? `<ul class="white-card ing-list">${ingRows}</ul>
             <p class="fineprint">Untick what you already have at home.</p>`
          : `<ol class="white-card steps">${steps}</ol>
             ${r.source ? `<p class="fineprint">Short version in our own words. Full method on <a href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">${esc(r.source.name)}</a>.</p>` : ''}`
      }
    </div>
    <button class="dark-cta sticky-cta" data-act="add-to-list" data-id="${id}" ${selectedCount ? '' : 'disabled'}>
      ${icon('bag', 20)}<span>Add ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'} to shopping list</span>
    </button>
  `;
}

function addRecipeToList(id) {
  const r = RECIPE_BY_ID[id];
  const ev = evaluate(r);
  const factor = recipeServings(r) / r.servings;
  const unchecked = ui.unchecked[id] || new Set();
  let added = 0;
  for (const [iid, amount, unit] of r.ingredients) {
    if (ev.omitted.includes(iid) || unchecked.has(iid)) continue;
    const ing = ING[iid];
    const key = `${iid}|${unit}`;
    const qty = amount == null ? null : amount * factor;
    // A "phase tip" entry without amount gets replaced by the real amount
    state.shopping = state.shopping.filter((i) => !(i.key === `${iid}|tip` && !i.checked));
    const existing = state.shopping.find((i) => i.key === key && !i.checked);
    if (existing) {
      if (qty != null) existing.amount = (existing.amount || 0) + qty;
      if (!existing.sources.includes(r.title)) existing.sources.push(r.title);
    } else {
      state.shopping.push({ id: uid(), key, ingId: iid, name: ing.name, amount: qty, unit, cat: ing.cat, checked: false, sources: [r.title] });
    }
    added++;
  }
  commit();
  render();
  toast(`${added} ${added === 1 ? 'item' : 'items'} added to your shopping list`);
}

// ───────────────────────── Shopping list ─────────────────────────

function shopRow(i) {
  const amt = fmtAmount(i.amount, i.unit, true);
  const src = i.sources?.length ? `for ${i.sources.join(', ')}` : '';
  return `
    <li class="shop-row ${i.checked ? 'done' : ''}">
      <label>
        <input type="checkbox" class="round-check" data-change="shop-toggle" data-id="${i.id}" ${i.checked ? 'checked' : ''}>
        <span class="shop-text">
          <span class="shop-name">${esc(i.name)}</span>
          ${src ? `<span class="shop-src">${esc(src)}</span>` : ''}
        </span>
        ${amt ? `<span class="shop-amt">${esc(amt)}</span>` : ''}
      </label>
      <button class="x-btn" data-act="shop-remove" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">${icon('x', 16)}</button>
    </li>`;
}

function viewList() {
  const items = state.shopping;
  const done = items.filter((i) => i.checked).length;
  const left = items.length - done;
  const recipeCount = new Set(items.flatMap((i) => i.sources || []).filter((s) => s !== 'phase tip')).size;
  const groups = CATEGORIES.map((c) => ({
    ...c,
    items: items.filter((i) => i.cat === c.id).sort((a, b) => a.checked - b.checked),
  })).filter((g) => g.items.length);
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  app.innerHTML = `
    <div class="row between list-head">
      <div>
        <h1 class="page-title">Shopping list</h1>
        <span class="subtle">${recipeCount ? `For ${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}` : items.length ? 'Your items' : 'Nothing planned yet'}</span>
      </div>
      ${items.length ? `<button class="circle-btn" data-act="share" aria-label="Share list">${icon('share', 20)}</button>` : ''}
    </div>
    ${
      items.length
        ? `<div class="white-card progress-card">
            <div class="row between"><span class="strong">${done} of ${items.length} in your basket</span><span class="subtle">${left === 0 ? 'All done' : left + ' to go'}</span></div>
            <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
          </div>`
        : ''
    }
    <form class="add-form" data-submit="shop-add">
      <label class="sr-only" for="addItem">Add an item</label>
      <input id="addItem" name="entry" placeholder="Add an item…" autocomplete="off" enterkeyhint="done">
      <button class="add-btn" aria-label="Add">${icon('plus', 22)}</button>
    </form>
    ${
      items.length === 0
        ? `<div class="empty big">
            ${icon('bag', 40, 'muted')}
            <p class="strong">Your list is empty</p>
            <p class="fineprint">Open a recipe and tap “Add to shopping list”. Same ingredients from several recipes are added up automatically.</p>
            <a class="dark-cta inline" href="#/recipes">Browse recipes</a>
          </div>`
        : `${groups.map((g) => `<section class="shop-group"><h2 class="group-title">${esc(g.name)}</h2><ul class="white-card shop-list">${g.items.map(shopRow).join('')}</ul></section>`).join('')}
          <div class="row-actions">
            ${done ? '<button class="btn ghost" data-act="shop-clear-done">Remove checked</button>' : ''}
            <button class="btn ghost danger-text" data-act="shop-clear-all">Clear list</button>
          </div>`
    }
  `;
}

function guessCategory(name) {
  const n = normalize(name.trim());
  const hit = INGREDIENTS.find(
    (i) => normalize(i.name).startsWith(n) || n.startsWith(normalize(i.name)) || (i.alt || []).some((a) => normalize(a) === n || n === normalize(a) + 's')
  );
  return hit ? hit.cat : 'other';
}

async function shareList() {
  const lines = ['Shopping list (Cycle Kitchen)', ''];
  for (const c of CATEGORIES) {
    const items = state.shopping.filter((i) => !i.checked && i.cat === c.id);
    if (!items.length) continue;
    lines.push(c.name);
    for (const i of items) {
      const amt = fmtAmount(i.amount, i.unit, true);
      lines.push(`• ${i.name}${amt ? ' – ' + amt : ''}`);
    }
    lines.push('');
  }
  const text = lines.join('\n').trim();
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Shopping list', text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('List copied to clipboard');
  } catch (e) {
    if (e && e.name !== 'AbortError') toast("Couldn't share the list");
  }
}

// ───────────────────────── Shared: diet & dislikes ─────────────────────────

function dietOptions(current) {
  return Object.entries(DIETS)
    .map(([k, d]) => {
      const on = current === k;
      return `
        <button type="button" class="option ${on ? 'on' : ''}" aria-pressed="${on}" data-act="set-diet" data-diet="${k}">
          <span class="option-text"><span class="option-title">${esc(d.name)}</span><span class="option-hint">${esc(d.hint)}</span></span>
          <span class="option-mark">${on ? icon('check', 16) : ''}</span>
        </button>`;
    })
    .join('');
}

function avoidChips(current) {
  return Object.entries(AVOID_TAGS)
    .map(([k, label]) => {
      const on = current.includes(k);
      return `<button type="button" class="chip ${on ? 'on' : ''}" aria-pressed="${on}" data-act="toggle-avoid" data-tag="${k}">${esc(label)}</button>`;
    })
    .join('');
}

function renderDislikes() {
  const area = document.getElementById('dislikeArea');
  if (!area) return;
  const t = editTarget();
  const q = normalize(ui.dislikeSearch.trim());
  let ids;
  if (q) {
    ids = INGREDIENTS.filter((i) => normalize(i.name).includes(q) || (i.alt || []).some((a) => normalize(a).includes(q))).map((i) => i.id);
  } else {
    ids = [...new Set([...t.excluded, ...COMMON_DISLIKES])];
  }
  const title = q ? 'Results' : 'Often skipped';
  area.innerHTML = `
    <h2 class="group-title">${title}</h2>
    ${
      ids.length
        ? `<div class="chips" role="group" aria-label="Ingredients to exclude">${ids
            .slice(0, 40)
            .map((id) => {
              const on = t.excluded.includes(id);
              return `<button type="button" class="chip big ${on ? 'on' : ''}" aria-pressed="${on}" data-act="toggle-exclude" data-id="${id}">
                <span>${esc(ING[id].name)}</span>${icon(on ? 'x' : 'plus', 16, on ? 'lime' : 'muted')}</button>`;
            })
            .join('')}</div>`
        : '<p class="fineprint">No matching ingredient.</p>'
    }`;
  const summary = document.getElementById('dislikeSummary');
  if (summary) {
    const names = t.excluded.map((id) => ING[id].name);
    summary.textContent = names.length ? 'Excluding: ' + names.join(', ') : 'Nothing excluded – you can change this anytime.';
  }
  const cta = document.getElementById('finishBtn');
  if (cta) cta.textContent = t.excluded.length ? 'Finish' : 'Skip for now';
}

function dislikeSearchField() {
  return `
    <label class="search">
      ${icon('search', 20, 'muted')}
      <span class="sr-only">Search ingredients</span>
      <input type="search" placeholder="Search any ingredient" value="${esc(ui.dislikeSearch)}" data-input="dislike-search" autocomplete="off">
    </label>`;
}

// ───────────────────────── Settings ─────────────────────────

function viewSettings() {
  const s = state.settings;
  const avg = averageCycleLength(state.periodLog);
  app.innerHTML = `
    <div class="topbar">${backBtn('#/', 'Back to Today')}<h1 class="title-sm">Settings</h1></div>

    <section class="white-card form-card">
      <h2>You</h2>
      <label class="field">
        <span>Your name <small>(optional)</small></span>
        <input type="text" value="${esc(s.name)}" placeholder="So we can say hi" data-change="set-name" autocomplete="given-name" maxlength="30">
      </label>
    </section>

    <section class="white-card form-card">
      <h2>Your cycle</h2>
      <label class="field">
        <span>Last period started</span>
        <input type="date" value="${esc(s.lastPeriodStart)}" max="${toISO(today())}" data-change="set-date">
      </label>
      <div class="field-row">
        <span>Cycle length${avg ? `<small>Your average: ${avg} days</small>` : '<small>On average – a guess is fine</small>'}</span>
        ${stepper('cycleLength', s.cycleLength, 21, 40, `${s.cycleLength} days`, 'Shorter cycle', 'Longer cycle')}
      </div>
      <div class="field-row">
        <span>Period length</span>
        ${stepper('periodLength', s.periodLength, 2, 10, `${s.periodLength} days`, 'Shorter period', 'Longer period')}
      </div>
    </section>

    <section class="form-block">
      <h2 class="block-title">How you eat</h2>
      <div class="options" role="group" aria-label="Diet">${dietOptions(s.diet)}</div>
    </section>

    <section class="form-block">
      <h2 class="block-title">Intolerances</h2>
      <div class="chips">${avoidChips(s.avoidTags)}</div>
    </section>

    <section class="form-block">
      <h2 class="block-title">Ingredients you don't like</h2>
      <p class="fineprint">Recipes that need these are hidden. If it's only a garnish (like parsley on top), we keep the recipe and leave it out.</p>
      ${dislikeSearchField()}
      <div id="dislikeArea"></div>
    </section>

    <section class="white-card form-card">
      <h2>Recipes & shopping</h2>
      <div class="field-row">
        <span>Default servings</span>
        ${stepper('defaultServings', s.defaultServings, 1, 8, `${s.defaultServings} ${s.defaultServings === 1 ? 'serving' : 'servings'}`, 'Fewer servings', 'More servings')}
      </div>
      <label class="switch-row">
        <span><b>Skip pantry basics</b><small>Don't add salt, pepper, oils and spices to the list automatically</small></span>
        <input type="checkbox" class="switch" data-change="set-staples" ${s.skipStaples ? 'checked' : ''}>
      </label>
    </section>

    <section class="white-card form-card">
      <h2>Good to know</h2>
      <p class="fineprint">Cycle Kitchen offers general nutrition ideas and is not a substitute for medical or dietary advice. Phases are estimates and are <b>not a method of contraception</b>.</p>
      <p class="fineprint">Your data is stored only on this device.</p>
      <button class="btn ghost danger-text" data-act="reset">Delete all data</button>
    </section>
  `;
  renderDislikes();
}

// ───────────────────────── Onboarding ─────────────────────────

function obHeader(step) {
  const pct = [0, 33, 66, 100][step];
  return `
    <div class="ob-top">
      <button class="circle-btn" data-act="ob-back" aria-label="Back">${icon('back', 20)}</button>
      <div class="ob-progress">
        <span>Step ${step} of 3</span>
        <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </div>
    </div>`;
}

function calendar(selectedISO) {
  const t = today();
  const { y, m } = ui.cal;
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(y, m + 1, 0).getDate();
  const canNext = new Date(y, m + 1, 1) <= t;
  const canPrev = first > new Date(t.getFullYear(), t.getMonth() - 3, 1);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<span></span>');
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const iso = toISO(date);
    const fut = date > t;
    const sel = iso === selectedISO;
    const isToday = date.getTime() === t.getTime();
    const label = fmtDate(date, { month: 'long', day: 'numeric' });
    cells.push(
      `<button type="button" class="day ${sel ? 'sel' : ''} ${isToday && !sel ? 'today' : ''}" ${fut ? 'disabled' : ''} aria-pressed="${sel}" aria-label="${label}" data-act="pick-day" data-date="${iso}">${d}</button>`
    );
  }
  return `
    <div class="white-card calendar">
      <div class="cal-head">
        <span class="cal-month">${fmtDate(first, { month: 'long', year: 'numeric' })}</span>
        <span class="cal-nav">
          <button type="button" class="ghost-round" data-act="cal" data-delta="-1" aria-label="Previous month" ${canPrev ? '' : 'disabled'}>${icon('back', 18)}</button>
          <button type="button" class="ghost-round" data-act="cal" data-delta="1" aria-label="Next month" ${canNext ? '' : 'disabled'}>${icon('chevron', 18)}</button>
        </span>
      </div>
      <div class="cal-grid cal-wd" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
      <div class="cal-grid">${cells.join('')}</div>
    </div>`;
}

function viewOnboarding() {
  if (!ui.draft) ui.draft = { ...store.defaultState().settings };
  const d = ui.draft;
  const step = ui.obStep;
  let html = '';

  if (step === 0) {
    html = `
      <div class="screen welcome">
        <div class="row between">
          <span class="brand">${LOGO}<span>Cycle Kitchen</span></span>
          <span class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></span>
        </div>
        <div class="welcome-art" aria-hidden="true">
          <svg viewBox="0 0 250 250" class="welcome-ring">
            <g transform="rotate(-90 125 125)" fill="none" stroke-width="22">
              <circle cx="125" cy="125" r="100" stroke="#C4554B" stroke-dasharray="106.2 628.3"/>
              <circle cx="125" cy="125" r="100" stroke="#7FA33A" stroke-dasharray="173.5 628.3" stroke-dashoffset="-112.2"/>
              <circle cx="125" cy="125" r="100" stroke="#D9A21E" stroke-dasharray="61.3 628.3" stroke-dashoffset="-291.7"/>
              <circle cx="125" cy="125" r="100" stroke="#7B6BC0" stroke-dasharray="263.3 628.3" stroke-dashoffset="-359"/>
            </g>
            <text x="125" y="122" text-anchor="middle" font-size="46" font-weight="600" fill="#1F2A22">4</text>
            <text x="125" y="150" text-anchor="middle" font-size="15" fill="#5B635C">phases, 4 plates</text>
          </svg>
          <span class="float f1" style="background:#F4D5D0">Lentils</span>
          <span class="float f2" style="background:#DDEBB4">Oats</span>
          <span class="float f3" style="background:#F5E0A8">Berries</span>
          <span class="float f4" style="background:#DED7F1">Sweet potato</span>
        </div>
        <h1 class="display">Eat in sync with your cycle.</h1>
        <p class="lead">Know what your body needs each day – with matching recipes and a ready-made shopping list.</p>
        <button class="arrow-cta" data-act="ob-next"><span>Get started</span><span class="arrow-dot">${icon('arrow', 22)}</span></button>
      </div>`;
  } else if (step === 1) {
    if (!ui.cal) {
      const base = d.lastPeriodStart ? parseDate(d.lastPeriodStart) : today();
      ui.cal = { y: base.getFullYear(), m: base.getMonth() };
    }
    let preview = '<span class="pill-soft neutral">Pick the first day of your last period</span>';
    if (d.lastPeriodStart) {
      const info = getCycleInfo(d);
      preview = `<span class="pill-soft" style="${phaseVars(info.phaseId)}"><i class="dot"></i><span>Today is cycle day <strong>${info.displayDay}</strong> · ${esc(PHASES[info.phaseId].name)}</span></span>`;
    }
    html = `
      <div class="screen">
        ${obHeader(1)}
        <h1 class="ob-title">When did your last period start?</h1>
        ${calendar(d.lastPeriodStart)}
        <div class="white-card stepper-card">
          <span class="stack"><span class="strong">Cycle length</span><span class="subtle">On average – a guess is fine</span></span>
          ${stepper('cycleLength', d.cycleLength, 21, 40, `${d.cycleLength} days`, 'Shorter cycle', 'Longer cycle')}
        </div>
        <div class="preview">${preview}</div>
        <div class="spacer"></div>
        <button class="dark-cta" data-act="ob-next" ${d.lastPeriodStart ? '' : 'disabled'}>Continue</button>
      </div>`;
  } else if (step === 2) {
    html = `
      <div class="screen">
        ${obHeader(2)}
        <h1 class="ob-title tight">How do you eat?</h1>
        <p class="lead small">We'll only suggest recipes that fit.</p>
        <div class="options" role="group" aria-label="Diet">${dietOptions(d.diet)}</div>
        <h2 class="group-title">Intolerances</h2>
        <div class="chips">${avoidChips(d.avoidTags)}</div>
        <div class="spacer"></div>
        <button class="dark-cta" data-act="ob-next">Continue</button>
      </div>`;
  } else {
    html = `
      <div class="screen">
        ${obHeader(3)}
        <h1 class="ob-title tight">Anything you don't like?</h1>
        <p class="lead small">Tap to exclude. We'll leave these out of your recipes.</p>
        ${dislikeSearchField()}
        <div id="dislikeArea"></div>
        <div class="spacer"></div>
        <p class="subtle summary" id="dislikeSummary"></p>
        <button class="dark-cta" id="finishBtn" data-act="ob-finish">Finish</button>
        <p class="fineprint center">General nutrition ideas, not medical advice. Cycle estimates are not a method of contraception. Your data stays on your device.</p>
      </div>`;
  }
  app.innerHTML = html;
  renderDislikes();
}

// ───────────────────────── Events ─────────────────────────

/** What steppers & diet options edit: the onboarding draft or the real settings. */
function editTarget() {
  return state.settings.onboarded ? state.settings : ui.draft;
}

function afterSettingsChange() {
  if (state.settings.onboarded) commit();
  render();
}

const actions = {
  'log-period': async () => {
    const ok = await confirmDialog('Did your period start today? This begins a new cycle.', 'Yes, today');
    if (ok) logPeriod(toISO(today()));
  },
  'recipes-now': () => {
    ui.recipePhase = 'now';
  },
  'recipes-phase': (el) => {
    ui.recipePhase = el.dataset.phase === cycleInfo().phaseId ? 'now' : el.dataset.phase;
  },
  'phase-tab': (el) => {
    location.replace('#/phase/' + el.dataset.phase);
  },
  'food-toggle': (el) => toggleFood(el.dataset.id),
  meal: (el) => {
    ui.meal = el.dataset.meal;
    document.getElementById('mealChips').innerHTML = mealChips();
    renderRecipeResults();
  },
  back: () => {
    if (history.length > 1) history.back();
    else location.hash = '#/recipes';
  },
  fav: (el) => {
    const id = el.dataset.id;
    const i = state.favorites.indexOf(id);
    if (i >= 0) state.favorites.splice(i, 1);
    else state.favorites.push(id);
    commit();
    render();
    toast(i >= 0 ? 'Removed from saved recipes' : 'Saved ♥');
  },
  'recipe-tab': (el) => {
    ui.recipeTab = el.dataset.tab;
    render();
  },
  step: (el) => {
    const field = el.dataset.field;
    const delta = Number(el.dataset.delta);
    const min = Number(el.dataset.min);
    const max = Number(el.dataset.max);
    if (field === 'servings') {
      const r = RECIPE_BY_ID[parseRoute().arg];
      ui.servings[r.id] = Math.min(max, Math.max(min, recipeServings(r) + delta));
      render();
      return;
    }
    const t = editTarget();
    t[field] = Math.min(max, Math.max(min, t[field] + delta));
    if (t.periodLength > t.cycleLength - 10) t.periodLength = t.cycleLength - 10;
    afterSettingsChange();
  },
  'add-to-list': (el) => addRecipeToList(el.dataset.id),
  'shop-remove': (el) => {
    state.shopping = state.shopping.filter((i) => i.id !== el.dataset.id);
    commit();
    render();
  },
  'shop-clear-done': () => {
    state.shopping = state.shopping.filter((i) => !i.checked);
    commit();
    render();
  },
  'shop-clear-all': async () => {
    if (!(await confirmDialog('Clear your whole shopping list?', 'Clear list', true))) return;
    state.shopping = [];
    commit();
    render();
  },
  share: () => shareList(),
  'set-diet': (el) => {
    editTarget().diet = el.dataset.diet;
    afterSettingsChange();
  },
  'toggle-avoid': (el) => {
    const t = editTarget();
    const tag = el.dataset.tag;
    t.avoidTags = t.avoidTags.includes(tag) ? t.avoidTags.filter((x) => x !== tag) : [...t.avoidTags, tag];
    afterSettingsChange();
  },
  'toggle-exclude': (el) => {
    const t = editTarget();
    const id = el.dataset.id;
    t.excluded = t.excluded.includes(id) ? t.excluded.filter((x) => x !== id) : [...t.excluded, id];
    if (state.settings.onboarded) commit();
    renderDislikes();
  },
  reset: async () => {
    if (!(await confirmDialog('Delete all data? Your cycle, settings, saved recipes and shopping list will be removed.', 'Delete everything', true))) return;
    store.clear();
    state = store.load();
    ui.draft = null;
    ui.obStep = 0;
    ui.cal = null;
    location.hash = '#/';
    render();
  },
  'pick-day': (el) => {
    ui.draft.lastPeriodStart = el.dataset.date;
    render();
  },
  cal: (el) => {
    const d = new Date(ui.cal.y, ui.cal.m + Number(el.dataset.delta), 1);
    ui.cal = { y: d.getFullYear(), m: d.getMonth() };
    render();
  },
  'ob-next': () => {
    ui.obStep = Math.min(3, ui.obStep + 1);
    ui.dislikeSearch = '';
    render();
    window.scrollTo(0, 0);
  },
  'ob-back': () => {
    ui.obStep = Math.max(0, ui.obStep - 1);
    render();
  },
  'ob-finish': () => {
    state.settings = { ...ui.draft, onboarded: true };
    state.periodLog = [ui.draft.lastPeriodStart];
    ui.draft = null;
    ui.dislikeSearch = '';
    commit();
    location.hash = '#/';
    render();
    window.scrollTo(0, 0);
  },
};

const changes = {
  'ing-toggle': (el) => {
    const set = ui.unchecked[el.dataset.recipe];
    if (el.checked) set.delete(el.dataset.id);
    else set.add(el.dataset.id);
    render();
  },
  'shop-toggle': (el) => {
    const item = state.shopping.find((i) => i.id === el.dataset.id);
    if (item) item.checked = el.checked;
    commit();
    render();
  },
  'recipe-phase': (el) => {
    ui.recipePhase = el.value;
    render();
  },
  'set-name': (el) => {
    state.settings.name = el.value.trim();
    commit();
  },
  'set-date': (el) => {
    if (!el.value) return;
    const s = state.settings;
    const old = s.lastPeriodStart;
    s.lastPeriodStart = el.value;
    // Correct the latest entry rather than starting a new cycle
    state.periodLog = [...new Set([...state.periodLog.filter((d) => d !== old), el.value])].sort();
    commit();
    toast('Saved');
  },
  'set-staples': (el) => {
    state.settings.skipStaples = el.checked;
    ui.unchecked = {};
    commit();
  },
};

const inputs = {
  'recipe-search': (el) => {
    ui.search = el.value;
    renderRecipeResults();
  },
  'dislike-search': (el) => {
    ui.dislikeSearch = el.value;
    renderDislikes();
  },
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  actions[el.dataset.act]?.(el, e);
});
app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) changes[el.dataset.change]?.(el, e);
});
app.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) inputs[el.dataset.input]?.(el, e);
});
app.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-submit="shop-add"]');
  if (!form) return;
  e.preventDefault();
  const name = form.elements.namedItem('entry').value.trim();
  if (!name) return;
  state.shopping.push({ id: uid(), key: `manual|${uid()}`, ingId: null, name, amount: null, unit: '', cat: guessCategory(name), checked: false, sources: [] });
  commit();
  render();
  document.getElementById('addItem')?.focus();
});

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});

// Recalculate when returning to the app (e.g. the next day)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.settings.onboarded && parseRoute().name === '') render();
});

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// For console debugging
window.__cyclekitchen = { state: () => state };
