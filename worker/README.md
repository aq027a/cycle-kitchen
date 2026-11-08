# Cycle Kitchen – recipe API (Cloudflare Worker)

A tiny server that sits between the app and Spoonacular. It keeps the Spoonacular API key
secret and only offers two read-only endpoints (`/search`, `/recipe/:id`). Only the live app
(`https://aq027a.github.io`) and local testing (`http://localhost:8080`) may call it.

## One-time setup

1. **Spoonacular key** – sign up at https://spoonacular.com/food-api/console and copy your API key
   from the console (Profile → API Key). The free plan has 50 points per day.
2. **Cloudflare account** – sign up for free at https://dash.cloudflare.com/sign-up.
3. **Deploy** – in a terminal:

   ```bash
   cd worker
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put SPOONACULAR_KEY
   ```

   `wrangler login` opens the browser to connect your Cloudflare account.
   `secret put` asks for the key – paste it there (never into code or chat).
   `deploy` prints the worker address, e.g. `https://cycle-kitchen-api.<your-name>.workers.dev`.
4. Put that address into `js/config.js` (`API_BASE`) and publish the app.

## Notes

- Spoonacular terms: data may be cached for at most 1 hour (the worker caches exactly that long),
  only id, title and image URL may be stored permanently, every recipe must credit its original
  source, and the free plan needs a visible “Powered by Spoonacular” link – the app does all of this.
- Approximate cost per day for one person: a search ≈ 2.4 points, opening a recipe ≈ 1.1 points.
  When the daily quota is used up, the app shows a friendly note and the own recipes keep working.
