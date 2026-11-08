// Ingredient catalog. Tags drive the filters:
//  meat, fish        → not vegetarian
//  dairy, egg, honey → not vegan
//  gluten, nuts      → intolerances
// staple: true       → pantry basics (left off the shopping list by default)

export const CATEGORIES = [
  { id: 'produce', name: 'Fruit & veg' },
  { id: 'fridge', name: 'Fridge' },
  { id: 'meatfish', name: 'Meat & fish' },
  { id: 'pantry', name: 'Pantry' },
  { id: 'seeds', name: 'Nuts & seeds' },
  { id: 'spices', name: 'Spices & oils' },
  { id: 'other', name: 'Other' },
];

const I = (id, name, cat, tags = [], extra = {}) => ({ id, name, cat, tags, ...extra });

export const INGREDIENTS = [
  // Fruit & veg
  I('spinach', 'Spinach', 'produce', [], { alt: ['Baby spinach'] }),
  I('beetroot', 'Beetroot (cooked)', 'produce', [], { alt: ['Beets'] }),
  I('sweet_potato', 'Sweet potato', 'produce'),
  I('pumpkin', 'Hokkaido pumpkin', 'produce', [], { alt: ['Squash', 'Kabocha'] }),
  I('ginger', 'Ginger', 'produce'),
  I('garlic', 'Garlic', 'produce'),
  I('onion', 'Onion', 'produce'),
  I('red_onion', 'Red onion', 'produce', [], { alt: ['Onion'] }),
  I('spring_onion', 'Spring onion', 'produce', [], { alt: ['Scallion', 'Green onion'] }),
  I('carrot', 'Carrot', 'produce'),
  I('lemon', 'Lemon', 'produce'),
  I('lime', 'Lime', 'produce'),
  I('orange', 'Orange', 'produce', [], { alt: ['Citrus'] }),
  I('parsley', 'Parsley', 'produce'),
  I('coriander', 'Cilantro', 'produce', [], { alt: ['Coriander'] }),
  I('basil', 'Basil', 'produce'),
  I('mint', 'Mint', 'produce'),
  I('dill', 'Dill', 'produce'),
  I('chives', 'Chives', 'produce'),
  I('zucchini', 'Zucchini', 'produce', [], { alt: ['Courgette'] }),
  I('eggplant', 'Eggplant', 'produce', [], { alt: ['Aubergine'] }),
  I('broccoli', 'Broccoli', 'produce'),
  I('bell_pepper', 'Bell pepper', 'produce', [], { alt: ['Pepper', 'Capsicum'] }),
  I('tomato', 'Tomato', 'produce'),
  I('cherry_tomato', 'Cherry tomatoes', 'produce', [], { alt: ['Tomato'] }),
  I('cucumber', 'Cucumber', 'produce'),
  I('avocado', 'Avocado', 'produce'),
  I('mushrooms', 'Mushrooms', 'produce', [], { alt: ['Champignons'] }),
  I('pak_choi', 'Bok choy', 'produce', [], { alt: ['Pak choi'] }),
  I('red_cabbage', 'Red cabbage', 'produce'),
  I('rocket', 'Arugula', 'produce', [], { alt: ['Rocket'] }),
  I('sprouts', 'Sprouts', 'produce'),
  I('peas', 'Peas (frozen)', 'produce'),
  I('edamame', 'Edamame (frozen)', 'produce'),
  I('banana', 'Banana', 'produce'),
  I('berries', 'Berries (fresh or frozen)', 'produce', [], { alt: ['Blueberries', 'Raspberries', 'Strawberries'] }),
  I('mango', 'Mango', 'produce'),
  I('pomegranate', 'Pomegranate', 'produce'),
  I('apple', 'Apple', 'produce'),

  // Fridge
  I('eggs', 'Eggs', 'fridge', ['egg'], { alt: ['Egg'] }),
  I('greek_yogurt', 'Greek yogurt', 'fridge', ['dairy'], { alt: ['Yogurt'] }),
  I('plant_yogurt', 'Plant-based yogurt', 'fridge', [], { alt: ['Soy yogurt', 'Coconut yogurt'] }),
  I('milk', 'Milk', 'fridge', ['dairy']),
  I('oat_milk', 'Oat milk', 'fridge', ['gluten'], { alt: ['Plant milk'] }),
  I('feta', 'Feta', 'fridge', ['dairy'], { alt: ['Cheese'] }),
  I('parmesan', 'Parmesan', 'fridge', ['dairy'], { alt: ['Cheese'] }),
  I('tofu', 'Tofu (plain)', 'fridge'),
  I('tempeh', 'Tempeh', 'fridge'),
  I('sauerkraut', 'Sauerkraut', 'fridge'),
  I('miso', 'Miso paste', 'fridge'),
  I('hummus', 'Hummus', 'fridge'),

  // Meat & fish
  I('salmon', 'Salmon fillet', 'meatfish', ['fish'], { alt: ['Fish'] }),
  I('smoked_salmon', 'Smoked salmon', 'meatfish', ['fish'], { alt: ['Fish', 'Salmon'] }),
  I('beef', 'Ground beef', 'meatfish', ['meat'], { alt: ['Mince', 'Meat'] }),
  I('chicken', 'Chicken breast', 'meatfish', ['meat'], { alt: ['Meat'] }),

  // Pantry
  I('red_lentils', 'Red lentils', 'pantry', [], { alt: ['Lentils'] }),
  I('chickpeas', 'Chickpeas (canned)', 'pantry', [], { alt: ['Garbanzo'] }),
  I('black_beans', 'Black beans (canned)', 'pantry', [], { alt: ['Beans'] }),
  I('chopped_tomatoes', 'Chopped tomatoes (canned)', 'pantry', [], { alt: ['Tomato'] }),
  I('coconut_milk', 'Coconut milk', 'pantry', [], { alt: ['Coconut'] }),
  I('veg_broth', 'Vegetable broth', 'pantry', [], { alt: ['Stock'] }),
  I('quinoa', 'Quinoa', 'pantry'),
  I('brown_rice', 'Brown rice', 'pantry', [], { alt: ['Rice'] }),
  I('millet', 'Millet', 'pantry'),
  I('oats', 'Rolled oats', 'pantry', ['gluten'], { alt: ['Oats', 'Oatmeal'] }),
  I('wholegrain_bread', 'Whole-grain bread', 'pantry', ['gluten'], { alt: ['Bread'] }),
  I('tortillas', 'Whole-wheat tortillas', 'pantry', ['gluten'], { alt: ['Wraps'] }),
  I('soy_sauce', 'Soy sauce', 'pantry', ['gluten'], { alt: ['Tamari'] }),
  I('dark_chocolate', 'Dark chocolate (70%+)', 'pantry', [], { alt: ['Chocolate'] }),
  I('cocoa', 'Cocoa powder', 'pantry', [], { alt: ['Cacao'] }),
  I('dates', 'Dates (pitted)', 'pantry'),
  I('maple_syrup', 'Maple syrup', 'pantry'),
  I('honey', 'Honey', 'pantry', ['honey']),
  I('tahini', 'Tahini', 'pantry', [], { alt: ['Sesame'] }),
  I('peanut_butter', 'Peanut butter', 'pantry', ['nuts'], { alt: ['Peanuts'] }),
  I('coconut_flakes', 'Shredded coconut', 'pantry', [], { alt: ['Coconut'] }),

  // Nuts & seeds
  I('pumpkin_seeds', 'Pumpkin seeds', 'seeds', [], { alt: ['Pepitas'] }),
  I('sunflower_seeds', 'Sunflower seeds', 'seeds'),
  I('flaxseed', 'Ground flaxseed', 'seeds', [], { alt: ['Linseed'] }),
  I('chia', 'Chia seeds', 'seeds'),
  I('sesame', 'Sesame seeds', 'seeds'),
  I('walnuts', 'Walnuts', 'seeds', ['nuts'], { alt: ['Nuts'] }),
  I('almonds', 'Almonds', 'seeds', ['nuts'], { alt: ['Nuts'] }),
  I('almond_butter', 'Almond butter', 'seeds', ['nuts'], { alt: ['Nut butter'] }),

  // Spices & oils (pantry basics)
  I('olive_oil', 'Olive oil', 'spices', [], { staple: true }),
  I('coconut_oil', 'Coconut oil', 'spices', [], { staple: true }),
  I('sesame_oil', 'Toasted sesame oil', 'spices', [], { staple: true }),
  I('salt_pepper', 'Salt & pepper', 'spices', [], { staple: true }),
  I('cumin', 'Ground cumin', 'spices', [], { staple: true }),
  I('turmeric', 'Turmeric', 'spices', [], { staple: true }),
  I('cinnamon', 'Cinnamon', 'spices', [], { staple: true }),
  I('paprika_powder', 'Sweet paprika', 'spices', [], { staple: true }),
  I('curry_powder', 'Curry powder', 'spices', [], { staple: true, alt: ['Curry'] }),
  I('chili_flakes', 'Chili flakes', 'spices', [], { staple: true, alt: ['Chili', 'Spicy'] }),
  I('balsamic', 'Balsamic vinegar', 'spices', [], { staple: true, alt: ['Vinegar'] }),
];

export const ING = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Often skipped → quick picks in onboarding & settings
export const COMMON_DISLIKES = [
  'zucchini', 'parsley', 'coriander', 'mushrooms', 'eggplant', 'beetroot', 'tofu', 'onion',
  'coconut_milk', 'sauerkraut', 'avocado', 'dill', 'ginger', 'red_cabbage', 'feta', 'chili_flakes',
];

// Diets: which tags are excluded?
export const DIETS = {
  omni: { name: 'Everything', hint: 'No restrictions', forbidden: [] },
  flexitarian: { name: 'Flexitarian', hint: 'Mostly plants, meat now and then', forbidden: [], preferPlants: true },
  pescetarian: { name: 'Pescatarian', hint: 'Vegetarian plus fish & seafood', forbidden: ['meat'] },
  vegetarian: { name: 'Vegetarian', hint: 'No meat or fish', forbidden: ['meat', 'fish'] },
  vegan: { name: 'Vegan', hint: 'No animal products', forbidden: ['meat', 'fish', 'dairy', 'egg', 'honey'] },
};

// Intolerances / extra exclusions
export const AVOID_TAGS = {
  gluten: 'Gluten-free',
  dairy: 'Dairy-free',
  egg: 'Egg-free',
  nuts: 'Nut-free',
};
