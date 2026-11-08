// Cycle Kitchen – recipe API proxy (Cloudflare Worker)
//
// Keeps the Spoonacular API key secret and only exposes two small, read-only endpoints:
//   GET /search?phase=&cuisine=&type=&diet=&intolerances=&exclude=&q=&offset=
//   GET /recipe/:id
// Responses are cached for at most 1 hour (Spoonacular terms allow max. 1 hour caching).
// The key is set with:  npx wrangler secret put SPOONACULAR_KEY

const API = 'https://api.spoonacular.com';
const CACHE_SECONDS = 3600; // Spoonacular terms: max. 1 hour
const PAGE_SIZE = 12;

// Phase → nutrient focus (per serving). One nutrient filter costs +1 point per search.
const PHASE_FILTER = {
  menstruation: { minIron: 4 }, // mg
  follicular: { minProtein: 20 }, // g
  ovulation: { minFiber: 8 }, // g
  luteal: { minMagnesium: 90 }, // mg
};

const ALLOWED = {
  cuisine: /^[a-z ,]{0,120}$/i,
  type: /^[a-z ]{0,30}$/i,
  diet: /^[a-z |,]{0,60}$/i,
  intolerances: /^[a-z ,]{0,120}$/i,
  exclude: /^[a-z ,'-]{0,400}$/i,
  q: /^[\p{L}\p{N} ,'&-]{0,60}$/u,
};

// Nutrients we show in the app
const KEEP_NUTRIENTS = ['Iron', 'Magnesium', 'Fiber', 'Protein', 'Vitamin B6', 'Calcium', 'Calories'];

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}`, ...headers },
  });
}

async function spoon(path, params, env) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  url.searchParams.set('apiKey', env.SPOONACULAR_KEY);
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (res.status === 402) throw Object.assign(new Error('daily quota used up'), { status: 429 });
  if (!res.ok) throw Object.assign(new Error('upstream error ' + res.status), { status: 502 });
  return res.json();
}

async function search(params, env) {
  for (const [k, re] of Object.entries(ALLOWED)) {
    if (params.get(k) && !re.test(params.get(k))) throw Object.assign(new Error('bad parameter: ' + k), { status: 400 });
  }
  const offset = Math.min(Math.max(parseInt(params.get('offset') || '0', 10) || 0, 0), 900);
  const phase = params.get('phase');
  const data = await spoon(
    '/recipes/complexSearch',
    {
      query: params.get('q') || '',
      cuisine: params.get('cuisine') || '',
      type: params.get('type') || '',
      diet: params.get('diet') || '',
      intolerances: params.get('intolerances') || '',
      excludeIngredients: params.get('exclude') || '',
      instructionsRequired: true,
      addRecipeInformation: true,
      number: PAGE_SIZE,
      offset,
      sort: 'popularity',
      maxSugar: 25, // g per serving – keeps desserts and sugary dishes out of the suggestions
      ...(PHASE_FILTER[phase] || {}),
    },
    env
  );
  return {
    total: data.totalResults || 0,
    offset,
    results: (data.results || []).map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image,
      readyInMinutes: r.readyInMinutes,
      servings: r.servings,
      sourceName: r.sourceName || r.creditsText || '',
      cuisines: r.cuisines || [],
      diets: r.diets || [],
      // nutrient value that matched the phase filter (complexSearch returns it)
      nutrients: (r.nutrition?.nutrients || []).map((n) => ({ name: n.name, amount: n.amount, unit: n.unit })),
    })),
  };
}

async function recipe(id, env) {
  const r = await spoon(`/recipes/${id}/information`, { includeNutrition: true }, env);
  const steps = (r.analyzedInstructions || []).flatMap((block) => (block.steps || []).map((s) => s.step));
  return {
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings,
    sourceName: r.sourceName || r.creditsText || '',
    sourceUrl: r.sourceUrl || r.spoonacularSourceUrl || '',
    cuisines: r.cuisines || [],
    diets: r.diets || [],
    ingredients: (r.extendedIngredients || []).map((i) => ({
      name: i.nameClean || i.name,
      original: i.original,
      amount: i.measures?.metric?.amount ?? i.amount,
      unit: i.measures?.metric?.unitShort ?? i.unit ?? '',
      aisle: i.aisle || '',
    })),
    steps: steps.length ? steps : r.instructions ? [r.instructions.replace(/<[^>]+>/g, ' ').trim()] : [],
    nutrients: (r.nutrition?.nutrients || [])
      .filter((n) => KEEP_NUTRIENTS.includes(n.name))
      .map((n) => ({ name: n.name, amount: n.amount, unit: n.unit, percent: n.percentOfDailyNeeds })),
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, headers);
    if (!env.SPOONACULAR_KEY) return json({ error: 'API key not configured' }, 500, headers);

    const url = new URL(request.url);
    // Cache per URL (max. 1 hour) so repeated views don't use up the daily quota
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    if (cache) {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const res = new Response(hit.body, hit);
        for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
        return res;
      }
    }

    try {
      let data;
      if (url.pathname === '/search') {
        data = await search(url.searchParams, env);
      } else {
        const m = url.pathname.match(/^\/recipe\/(\d{1,9})$/);
        if (!m) return json({ error: 'not found' }, 404, headers);
        data = await recipe(m[1], env);
      }
      const res = json(data, 200, headers);
      if (cache) ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (e) {
      return json({ error: e.message }, e.status || 500, { ...headers, 'Cache-Control': 'no-store' });
    }
  },
};
