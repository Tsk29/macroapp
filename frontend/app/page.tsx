'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { useNutritionAgent } from './hooks';

const allCuisines = [
  { name: 'Mediterranean', emoji: '🥗' },
  { name: 'Italian', emoji: '🍝' },
  { name: 'Mexican', emoji: '🌮' },
  { name: 'Asian', emoji: '🍜' },
  { name: 'American', emoji: '🥩' },
  { name: 'Greek', emoji: '🥙' },
];

const initialRecipe = {
  name: 'Savory Mediterranean Bowl',
  cuisine: 'Mediterranean',
  calories: 620,
  protein_grams: 46,
  carbs: 54,
  fat: 23,
  ingredients: ['Chicken breast', 'Brown rice', 'Broccoli', 'Olive oil', 'Feta cheese'],
  instructions: [
    'Season and grill chicken with herbs.',
    'Cook brown rice until tender.',
    'Steam broccoli and toss with olive oil.',
    'Combine all ingredients and top with feta.',
  ],
};

export default function Home() {
  type IngredientDetailInput = { name: string; amount: string };

  const [ingredientDetails, setIngredientDetails] = useState<IngredientDetailInput[]>([
    { name: 'chicken thighs', amount: '200g' },
  ]);
  const [mode, setMode] = useState<'single_meal' | 'full_day'>('single_meal');
  const [mealType, setMealType] = useState('Lunch');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Mediterranean']);
  const [targetCalories, setTargetCalories] = useState(1900);
  const [targetProtein, setTargetProtein] = useState(130);
  const [targetCarbs, setTargetCarbs] = useState(180);
  const [targetFat, setTargetFat] = useState(60);
  const { state, isLoading, error, generateRecipe } = useNutritionAgent();

  const recipe = useMemo(() => {
    if (state?.generated_recipe) {
      return state.generated_recipe;
    }
    return initialRecipe;
  }, [state]);

  const receipt = useMemo(
    () => {
      if (state?.scraper_results?.items?.length) {
        const stores = Array.from(new Set(state.scraper_results.items.map((item: any) => item.store)));
        return {
          missing: state.scraper_results.items,
          total: state.scraper_results.total_cost ?? 0,
          store: stores.length > 1 ? stores.join(' & ') : stores[0] ?? 'Lidl',
          cheapest: state.scraper_results.cheapest_store_overall ?? 'Lidl',
        };
      }

      if (state?.missing_ingredients?.length) {
        return {
          missing: state.missing_ingredients.map((item: string) => ({ name: item, store: 'Lidl', price: 0 })),
          total: state.shopping_estimate ?? state.missing_ingredients.length * 2.5,
          store: 'Lidl',
          cheapest: 'Lidl',
        };
      }

      return {
        missing: [
          { name: 'Olive oil', store: 'Lidl', price: 3.5 },
          { name: 'Feta cheese', store: 'Aldi Süd', price: 2.4 },
        ],
        total: 5.9,
        store: 'Lidl & Aldi Süd',
        cheapest: 'Lidl',
      };
    },
    [state],
  ) as { missing: Array<{ name: string; store: string; price: number }>; total: number; store: string; cheapest: string };

  const recipeInstructions = useMemo(() => {
    if (Array.isArray(recipe.instructions)) {
      return recipe.instructions;
    }
    return String(recipe.instructions)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [recipe.instructions]);

  const macros = useMemo(() => {
    const calories = recipe.calories ?? 0;
    const protein = recipe.protein_grams ?? 0;
    const fat = recipe.fat ?? 0;
    const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    return [
      { name: 'Protein', value: protein, color: 'from-emerald-400 to-teal-400' },
      { name: 'Carbs', value: carbs, color: 'from-sky-400 to-blue-400' },
      { name: 'Fat', value: fat, color: 'from-orange-400 to-amber-400' },
    ];
  }, [recipe]);

  async function handleGenerate() {
    await generateRecipe({
      user_prompt: ingredientDetails.map((item) => item.name).filter(Boolean).join(', '),
      mode,
      meal_type: mealType,
      cuisine_preferences: selectedCuisines,
      target_calories: targetCalories,
      target_protein: targetProtein,
      target_carbs: targetCarbs,
      target_fat: targetFat,
      ingredient_details: ingredientDetails,
    });
  }

  return (
    <main className="min-h-screen px-6 py-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Nutrition Agent</p>
                <h1 className="mt-3 text-4xl font-semibold text-white">Bento Meal Dashboard</h1>
                <p className="mt-3 max-w-2xl text-slate-400">Generate premium meal plans, grocery receipts, and macro summaries with AI-powered nutrition guidance.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 border border-white/10 px-5 py-4 text-slate-300 shadow-lg">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-300">{isLoading ? 'Cooking AI plans…' : 'Ready to craft meals'}</p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Meal setup</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Build your recipe</h2>
                </div>
                <Sparkles className="h-8 w-8 text-cyan-300" />
              </div>

              <div className="mt-8 grid gap-4">
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <label className="text-sm font-semibold text-slate-300">Ingredients</label>
                  <div className="space-y-3">
                    {ingredientDetails.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:grid-cols-[1.5fr_1fr_0.5fr]">
                        <input
                          value={item.name}
                          onChange={(event) => {
                            const next = [...ingredientDetails];
                            next[index] = { ...next[index], name: event.target.value };
                            setIngredientDetails(next);
                          }}
                          className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                          placeholder="Ingredient name"
                        />
                        <input
                          value={item.amount}
                          onChange={(event) => {
                            const next = [...ingredientDetails];
                            next[index] = { ...next[index], amount: event.target.value };
                            setIngredientDetails(next);
                          }}
                          className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                          placeholder="Amount / unit"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIngredientDetails((current) => current.filter((_, i) => i !== index));
                          }}
                          className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIngredientDetails((current) => [...current, { name: '', amount: '' }])}
                      className="inline-flex items-center justify-center rounded-3xl bg-slate-800/90 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-700/80"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <label className="text-sm font-semibold text-slate-300">Choose cuisine</label>
                  <div className="flex gap-3 overflow-x-auto whitespace-nowrap py-2">
                    {allCuisines.map((cuisine) => {
                      const active = selectedCuisines.includes(cuisine.name);
                      return (
                        <button
                          key={cuisine.name}
                          type="button"
                          onClick={() => {
                            setSelectedCuisines((current) =>
                              current.includes(cuisine.name)
                                ? current.filter((item) => item !== cuisine.name)
                                : [...current, cuisine.name]
                            );
                          }}
                          className={`inline-flex min-w-[120px] items-center gap-3 rounded-3xl border px-4 py-3 text-left transition ${
                            active
                              ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
                              : 'border-white/10 bg-slate-800/70 text-slate-200 hover:-translate-y-0.5 hover:bg-slate-700/80'
                          }`}
                        >
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950/80 text-lg shadow-soft">
                            {cuisine.emoji}
                          </span>
                          <span className="text-sm font-medium whitespace-nowrap">{cuisine.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <label className="text-sm font-semibold text-slate-300">Macro targets</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Calories
                      <input
                        type="number"
                        value={targetCalories}
                        onChange={(event) => setTargetCalories(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Protein (g)
                      <input
                        type="number"
                        value={targetProtein}
                        onChange={(event) => setTargetProtein(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Carbs (g)
                      <input
                        type="number"
                        value={targetCarbs}
                        onChange={(event) => setTargetCarbs(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Fat (g)
                      <input
                        type="number"
                        value={targetFat}
                        onChange={(event) => setTargetFat(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="mt-1 inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-sky-300" /> : <ArrowRight className="h-5 w-5 text-sky-300" />}
                  {isLoading ? 'Generating recipe...' : 'Generate recipe'}
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Macro rings</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Nutrition snapshot</h2>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>

              <div className="mt-8 grid gap-5">
                <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Calories</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{recipe.calories} kcal</p>
                    </div>
                    <div className="rounded-full bg-slate-800/80 px-4 py-3 text-sm text-slate-300">Target 1900 kcal</div>
                  </div>
                  <div className="grid gap-3">
                    {macros.map((macro) => (
                      <div key={macro.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-slate-300">
                          <span>{macro.name}</span>
                          <span>{macro.value}g</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/5">
                          <div className={`h-full rounded-full bg-gradient-to-r ${macro.color} transition-all`} style={{ width: `${Math.min(macro.value, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">The Recipe</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{recipe.name}</h2>
              </div>
              <div className="rounded-3xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">High protein</div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">Ingredients</h3>
                <ul className="mt-5 space-y-3 text-slate-200">
                  {(recipe.ingredients ?? []).map((ingredient: string) => (
                    <li key={ingredient} className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3">
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">Instructions</h3>
                <ol className="mt-5 space-y-4 text-slate-200">
                  {(recipe.instructions ?? []).map((step: string, index: number) => (
                    <li key={`${step}-${index}`} className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold text-slate-100">{index + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Grocery receipt</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {receipt.store.includes(' & ') ? 'Multi-store shopping list' : `${receipt.store} shopping list`}
                </h2>
              </div>
              <div className="rounded-3xl bg-blue-500/10 px-4 py-2 text-sm font-semibold text-sky-300">
                Best results from {receipt.cheapest}
              </div>
            </div>

            <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Stores</span>
                <span>{receipt.store}</span>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-4 text-slate-200">
                {receipt.missing.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0">
                    <div>
                      <p className="text-sm text-slate-300">{item.name}</p>
                      <p className="text-xs text-slate-500">Best price at {item.store}</p>
                    </div>
                    <p className="font-semibold text-white">€{item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-4 text-sm text-slate-200">
                <span>Total estimate</span>
                <span className="text-xl font-semibold text-white">€{receipt.total.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {isLoading ? (
            <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/70 p-8 shadow-soft backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Live AI view</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Generation status</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-800/60 px-4 py-3 text-sm text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                  <span>AI is calculating precise macros…</span>
                </div>
              </div>

              <div className="mt-7 grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-300">
                <p>Optimizing your meal around available pantry inventory, macro balance, and shopping cost.</p>
                <p className="text-sm text-slate-400">Next update in 3 seconds.</p>
              </div>
            </section>
          ) : null}
          {error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-200">
              <strong>Error:</strong> {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
