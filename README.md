# Cycle Kitchen

A web app (PWA) that suggests food, recipes and a shopping list based on your current cycle phase. Built for Android (Chrome): installable to the home screen and works offline.

Design based on the Claude Design prototype “Cycle Kitchen – App prototype”.

## Features

- **Onboarding:** pick your last period in a calendar, set your cycle length, diet (everything, flexitarian, pescatarian, vegetarian, vegan), intolerances and ingredients you don't like
- **Today:** phase card with cycle progress, what comes next, and recipes picked for your phase and time of day
- **What's good for you now:** key foods per phase with a reason, each one added to the shopping list with a tap
- **Recipes:** 29 recipes, filterable by phase, meal and saved, with search by ingredient
- **Recipe:** servings, “Why now?”, ingredients/method tabs; untick what you already have
- **Shopping list:** grouped by aisle, same ingredients merged across recipes, progress bar, your own items, share via WhatsApp & co.
- **Settings** (tap the avatar on Today): name, cycle, diet, dislikes, defaults
- All data stays on the device (localStorage). No server, no login.

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Get it on an Android phone

A PWA needs HTTPS. The easiest way:

1. Drag this folder onto **Netlify Drop** (app.netlify.com/drop), or publish via GitHub Pages or Vercel
2. Open the URL in Chrome on the phone
3. Menu (⋮) → **Install app** / **Add to Home screen**

## Structure

```
index.html              App shell + floating navigation
css/styles.css          Design (tokens from the prototype)
js/app.js               Screens, router, interactions
js/cycle.js             Cycle and phase calculation
js/store.js             Local storage
js/format.js            Amount and date formatting
js/data/phases.js       Phase copy, colors and key foods
js/data/ingredients.js  Ingredient catalog with tags (vegan, gluten, nuts …)
js/data/recipes.js      Recipes
sw.js                   Service worker (offline)
manifest.webmanifest    PWA manifest
```

### Recipe sources

The recipes are based on tested recipes from [BBC Good Food](https://www.bbcgoodfood.com). Ingredients and amounts follow the original; the method is a short summary in our own words. Each recipe links to its original (with photos) via `source`. Photos and original texts are not copied into the app.

### Adding a recipe

Add an `R({...})` to `js/data/recipes.js`, with a `source` link to the original. Ingredients reference ids from `ingredients.js`. Whether a recipe is vegan or vegetarian is worked out from its ingredients. Ingredients marked `{ optional: true }` are left out instead of hiding the recipe.

After changes, bump `CACHE` in `sw.js` so installed apps pick up the update.

## Note

General nutrition ideas, not medical advice. Cycle phases are estimates and are not a method of contraception.
