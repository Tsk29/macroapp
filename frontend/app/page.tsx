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

const initialRecipe = null;

export default function Home() {
  type IngredientInput = { name: string; amount: number; unit: 'g' | 'ml' | 'whole' };

  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: '', amount: 0, unit: 'g' },
  ]);
  const [mode, setMode] = useState<'single_meal' | 'full_day'>('single_meal');
  const [mealType, setMealType] = useState('Lunch');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Mediterranean']);
  const [targetCalories, setTargetCalories] = useState(1900);
  const [targetProtein, setTargetProtein] = useState(130);
  const [targetCarbs, setTargetCarbs] = useState(180);
  const [targetFat, setTargetFat] = useState(60);
  const { state, isLoading, error, generateRecipe } = useNutritionAgent();

  const recipe = useMemo(() => state?.generated_recipe ?? undefined, [state]);

  const receipt = useMemo(
    () => {
      if (state?.scraper_results?.items?.length) {
        const stores = Array.from(new Set(state.scraper_results.items.map((item: any) => item.store)));
        return {
          missing: state.scraper_results.items,
          total: state.scraper_results.total_cost ?? 0,
          store: stores.length > 1 ? stores.join(' & ') : stores[0] ?? 'Unknown',
          cheapest: state.scraper_results.cheapest_store_overall ?? 'Unknown',
        };
      }

      return {
        missing: [],
        total: 0,
        store: 'None',
        cheapest: 'None',
      };
    },
    [state],
  ) as { missing: Array<{ name: string; store: string; price: number }>; total: number; store: string; cheapest: string };

  const recipeInstructions = useMemo(() => {
    if (!recipe) {
      return [];
    }
    if (Array.isArray(recipe.instructions)) {
      return recipe.instructions;
    }
    return String(recipe.instructions)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [recipe]);

  const macroFit = useMemo(() => {
    return recipe?.macro_fit ?? {
      calories_target: targetCalories,
      calories_achieved: 0,
      calories_delta: 0,
      protein_target: targetProtein,
      protein_achieved: 0,
      protein_delta: 0,
      carbs_target: targetCarbs,
      carbs_achieved: 0,
      carbs_delta: 0,
      fat_target: targetFat,
      fat_achieved: 0,
      fat_delta: 0,
      match_score_percentage: 0.0,
    };
  }, [recipe, targetCalories, targetProtein, targetCarbs, targetFat]);

  async function handleGenerate() {
    const payload = {
      user_prompt: ingredients.map((item) => item.name).filter(Boolean).join(', '),
      mode,
      meal_type: mealType,
      cuisine_preference: selectedCuisines,
      target_calories: targetCalories,
      target_protein: targetProtein,
      target_carbs: targetCarbs,
      target_fat: targetFat,
      ingredients,
    };

    await generateRecipe(payload);
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
                    {ingredients.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-slate-900/80 p-3">
                        <input
                          value={item.name}
                          onChange={(event) => {
                            const next = [...ingredients];
                            next[index] = { ...next[index], name: event.target.value };
                            setIngredients(next);
                          }}
                          className="flex-1 min-w-[110px] rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                          placeholder="e.g. Chicken thighs"
                        />

                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={(event) => {
                            const next = [...ingredients];
                            next[index] = { ...next[index], amount: Number(event.target.value) };
                            setIngredients(next);
                          }}
                          className="w-16 rounded-xl border border-slate-700 bg-slate-950/70 px-2 py-2 text-sm text-white text-center focus:border-indigo-500 focus:outline-none"
                          placeholder="200"
                        />

                        <select
                          value={item.unit}
                          onChange={(event) => {
                            const next = [...ingredients];
                            next[index] = { ...next[index], unit: event.target.value as 'g' | 'ml' | 'whole' };
                            setIngredients(next);
                          }}
                          className="w-20 rounded-xl border border-slate-700 bg-slate-950/70 px-2 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="oz">oz</option>
                          <option value="whole">whole</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setIngredients((current) => current.filter((_, i) => i !== index));
                          }}
                          className="shrink-0 rounded-xl bg-rose-500/20 px-2.5 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/30"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIngredients((current) => [...current, { name: '', amount: 0, unit: 'g' }])}
                      className="inline-flex items-center justify-center rounded-3xl bg-slate-800/90 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-700/80"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <label className="text-sm font-semibold text-slate-300">Choose cuisine</label>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
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
                          className={`inline-flex items-center gap-3 rounded-3xl border px-4 py-3 text-sm font-medium transition ${
                            active
                              ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
                              : 'border-white/10 bg-slate-800/70 text-slate-200 hover:-translate-y-0.5 hover:bg-slate-700/80'
                          }`}
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950/80 text-lg shadow-soft">
                            {cuisine.emoji}
                          </span>
                          <span className="truncate">{cuisine.name}</span>
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
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Macro report</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Macro Match & Delta</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-3xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  <span>🟢</span>
                  <span>{macroFit.match_score_percentage}% Match</span>
                </div>
              </div>

              <div className="mt-8 grid gap-5">
                <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { label: 'Calories', target: macroFit.calories_target, actual: macroFit.calories_achieved, delta: macroFit.calories_delta },
                      { label: 'Protein', target: macroFit.protein_target, actual: macroFit.protein_achieved, delta: macroFit.protein_delta },
                      { label: 'Carbs', target: macroFit.carbs_target, actual: macroFit.carbs_achieved, delta: macroFit.carbs_delta },
                      { label: 'Fat', target: macroFit.fat_target, actual: macroFit.fat_achieved, delta: macroFit.fat_delta },
                    ].map((item) => (
                      <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <p className="mt-2 text-xl font-semibold text-white">{item.actual} / {item.target}{item.label !== 'Calories' ? 'g' : ' kcal'}</p>
                        <p className={`mt-1 text-sm ${item.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {item.delta >= 0 ? `+${item.delta}` : item.delta}
                          {item.label !== 'Calories' ? 'g' : ' kcal'}
                        </p>
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
                <h2 className="mt-2 text-2xl font-semibold text-white">{recipe?.name ?? 'No recipe generated yet'}</h2>
              </div>
              <div className="rounded-3xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">High protein</div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">Ingredients</h3>
                <ul className="mt-5 space-y-3 text-slate-200">
                  {(recipe?.ingredients ?? []).map((ingredient: any, index: number) => (
                    <li key={`${ingredient.name}-${index}`} className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span>{ingredient.name}</span>
                        <span className="text-sm text-slate-400">{ingredient.amount} {ingredient.unit}</span>
                      </div>
                    </li>
                  ))}
                  {!recipe?.ingredients?.length ? (
                    <li className="rounded-3xl border border-dashed border-white/20 bg-slate-900/80 px-4 py-3 text-slate-500">
                      Add ingredients and generate to see the recipe details.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">Instructions</h3>
                <ol className="mt-5 space-y-4 text-slate-200">
                  {recipeInstructions.length ? (
                    recipeInstructions.map((step: string, index: number) => (
                      <li key={`${step}-${index}`} className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-sm font-semibold text-slate-100">{index + 1}</span>
                        <p>{step}</p>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-3xl border border-dashed border-white/20 bg-slate-900/80 px-4 py-4 text-slate-500">
                      Generate a recipe to see step-by-step instructions.
                    </li>
                  )}
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
