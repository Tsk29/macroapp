'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
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

type IngredientInput = { id: string; name: string; amount: number; unit: 'g' | 'ml' | 'whole' };

const createIngredient = () => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  amount: 0,
  unit: 'g' as const,
});

export default function Home() {
  const [ingredients, setIngredients] = useState<IngredientInput[]>(() => [createIngredient()]);
  const [mode, setMode] = useState<'single_meal' | 'full_day'>('single_meal');
  const [mealType, setMealType] = useState('Lunch');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Mediterranean']);
  const [targetCalories, setTargetCalories] = useState(1900);
  const [targetProtein, setTargetProtein] = useState(130);
  const [targetCarbs, setTargetCarbs] = useState(180);
  const [targetFat, setTargetFat] = useState(60);
  const { state, isLoading, error, generateRecipe, parsePantryImage, saveMeal, fetchSavedMeals, login, register, updateProfile, logDailyMeal, fetchDailySummary } = useNutritionAgent();
  const [isSavedMealsOpen, setIsSavedMealsOpen] = useState(false);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLogging, setIsLogging] = useState<Record<string, boolean>>({});
  const [loggedStatus, setLoggedStatus] = useState<Record<string, boolean>>({});

  const meals = useMemo(() => {
    if (mode === 'full_day') {
      return state?.meal_plan?.meals ?? [];
    }

    return state?.generated_recipe ? [state.generated_recipe] : [];
  }, [mode, state]);

  const recipe = useMemo(() => meals[0] ?? undefined, [meals]);

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
      match_score_percentage: 0,
    };
  }, [recipe, targetCalories, targetProtein, targetCarbs, targetFat]);

  const categorizedMeals = useMemo(() => {
    const meals = dailySummary?.meals || [];
    return {
      Breakfast: meals.filter((m: any) => m.meal_type?.toLowerCase() === 'breakfast'),
      Lunch: meals.filter((m: any) => m.meal_type?.toLowerCase() === 'lunch'),
      Dinner: meals.filter((m: any) => m.meal_type?.toLowerCase() === 'dinner'),
      Snacks: meals.filter((m: any) => m.meal_type?.toLowerCase() === 'snack'),
      Other: meals.filter((m: any) => {
        const type = m.meal_type?.toLowerCase();
        return !['breakfast', 'lunch', 'dinner', 'snack'].includes(type);
      }),
    };
  }, [dailySummary]);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  async function handleParseImage() {
    if (!selectedImage) return;

    const parsedIngredients = await parsePantryImage(selectedImage);
    if (!parsedIngredients || !Array.isArray(parsedIngredients)) return;

    setIngredients((current) => [
      ...current,
      ...parsedIngredients.map((item: any) => ({
        id: item.id || createIngredient().id,
        name: item.name || '',
        amount: item.amount ?? 0,
        unit: item.unit || 'g',
      }))
    ]);
    setSelectedImage(null);
  }

  const getTodayString = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      setUserProfile(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      setTargetCalories(userProfile.target_calories);
      setTargetProtein(userProfile.target_protein);
      setTargetCarbs(userProfile.target_carbs);
      setTargetFat(userProfile.target_fat);
      fetchDailySummary(userProfile.username, getTodayString()).then(setDailySummary);
    }
  }, [userProfile]);

  async function handleUpdateProfile() {
    if (!userProfile) return;
    const profile = {
      username: userProfile.username,
      target_calories: targetCalories,
      target_protein: targetProtein,
      target_carbs: targetCarbs,
      target_fat: targetFat,
    };
    await updateProfile(profile);
    setUserProfile(profile);
  }

  async function handleLogin() {
    if (!usernameInput.trim() || !passwordInput.trim()) return;
    const profile = await login(usernameInput.trim(), passwordInput.trim());
    if (profile) setUserProfile(profile);
  }

  async function handleRegister() {
    if (!usernameInput.trim() || !passwordInput.trim()) return;
    const profile = await register(usernameInput.trim(), passwordInput.trim());
    if (profile) setUserProfile(profile);
  }

  function handleLogout() {
    localStorage.removeItem('nutrition_agent_profile');
    setUserProfile(null);
  }

  async function handleLogMeal(recipeToLog: any) {
    if (!userProfile || !recipeToLog) return;
    setIsLogging(prev => ({ ...prev, [recipeToLog.name]: true }));
    const result = await logDailyMeal(userProfile.username, getTodayString(), recipeToLog);
    if (result) {
      setLoggedStatus(prev => ({ ...prev, [recipeToLog.name]: true }));
      const newSummary = await fetchDailySummary(userProfile.username, getTodayString());
      setDailySummary(newSummary);
    }
    setIsLogging(prev => ({ ...prev, [recipeToLog.name]: false }));
  }

  async function handleGenerate() {
    const activeCalories = dailySummary ? dailySummary.remaining.calories : targetCalories;
    const activeProtein = dailySummary ? dailySummary.remaining.protein : targetProtein;
    const activeCarbs = dailySummary ? dailySummary.remaining.carbs : targetCarbs;
    const activeFat = dailySummary ? dailySummary.remaining.fat : targetFat;

    const payload = {
      user_prompt: ingredients.map((item) => item.name).filter(Boolean).join(', '),
      mode,
      meal_type: mealType,
      cuisine_preference: selectedCuisines,
      target_calories: activeCalories,
      target_protein: activeProtein,
      target_carbs: activeCarbs,
      target_fat: activeFat,
      ingredients,
    };

    await generateRecipe(payload);
    setLoggedStatus({});
    setSavedStatus({});
  }

  async function handleSaveMeal(recipeToSave: any) {
    if (!recipeToSave || savedStatus[recipeToSave.name]) return;
    setIsSaving(prev => ({ ...prev, [recipeToSave.name]: true }));
    const result = await saveMeal(recipeToSave);
    if (result) {
      setSavedStatus(prev => ({ ...prev, [recipeToSave.name]: true }));
    }
    setIsSaving(prev => ({ ...prev, [recipeToSave.name]: false }));
  }

  if (!userProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white">
              {isRegisterMode ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="mt-2 text-slate-400">
              {isRegisterMode
                ? 'Create a new account to save your macros.'
                : 'Enter your credentials to access your daily macro tracker.'}
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. tharun"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (isRegisterMode ? handleRegister() : handleLogin())}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-rose-400 text-sm text-center">{error}</p>}
            <button
              onClick={isRegisterMode ? handleRegister : handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 transition px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isRegisterMode ? 'Sign Up' : 'Sign In')}
            </button>
            <div className="text-center mt-4">
              <button
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-sm text-slate-400 hover:text-white transition"
              >
                {isRegisterMode ? 'Already have an account? Sign In' : 'Need an account? Create one'}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 lg:px-12">
      <div className="mx-auto grid max-w-[1400px] gap-6 xl:grid-cols-[280px_1.2fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-soft backdrop-blur-xl sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Your Logs</p>
                <h2 className="text-xl font-semibold text-white mt-1">Daily Diary</h2>
              </div>
            </div>
            
            <div className="space-y-6">
              {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other'].map((category) => {
                const meals = categorizedMeals[category as keyof typeof categorizedMeals];
                if (category === 'Other' && meals.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center justify-between">
                      {category}
                      <span className="text-xs text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">{meals.length}</span>
                    </h3>
                    {meals.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-4 text-center text-xs text-slate-500">
                        No {category.toLowerCase()} logged
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {meals.map((meal: any, idx: number) => (
                          <div key={idx} className="rounded-2xl border border-white/5 bg-slate-950/70 p-3 shadow-sm">
                            <p className="text-sm font-semibold text-white truncate" title={meal.title || meal.name}>
                              {meal.title || meal.name}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <span className="text-emerald-400/90">{meal.macro_fit?.calories_achieved || 0} kcal</span>
                              <span>•</span>
                              <span className="text-indigo-400/90">{meal.macro_fit?.protein_achieved || 0}g P</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Nutrition Agent</p>
                <div className="flex items-center justify-between mt-3">
                  <h1 className="text-4xl font-semibold text-white">TSK Meal Dashboard</h1>
                  <button
                    onClick={handleLogout}
                    className="rounded-2xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                  >
                    Sign Out
                  </button>
                </div>
                <p className="mt-3 max-w-2xl text-slate-400">Generate premium meal plans, grocery receipts, and macro summaries with AI-powered nutrition guidance.</p>
                <div className="mt-6 flex flex-col gap-4">
                  <div className="rounded-3xl bg-slate-950/80 border border-white/10 px-5 py-4 text-slate-300 shadow-lg">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                    <p className="mt-1 font-semibold flex items-center gap-2 text-emerald-300">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      </span>
                      {isLoading ? 'Cooking AI plans…' : 'Ready to craft meals'}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setIsSavedMealsOpen(true);
                      const meals = await fetchSavedMeals();
                      setSavedMeals(meals);
                    }}
                    className="rounded-3xl bg-indigo-500/20 px-5 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/30 text-center"
                  >
                    View Saved Meals
                  </button>
                </div>
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
                  <label className="text-sm font-semibold text-slate-300">Planning scope</label>
                  <div className="inline-flex overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 text-sm text-slate-300 shadow-inner">
                    {[
                      { label: 'Single Meal', value: 'single_meal' },
                      { label: 'Full Day', value: 'full_day' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMode(option.value as 'single_meal' | 'full_day')}
                        className={`px-4 py-3 transition ${
                          mode === option.value
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-transparent text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <label className="text-sm font-semibold text-slate-300">Ingredients</label>
                  <div className="space-y-3">
                    {ingredients.map((item, index) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-slate-900/80 p-3">
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
                      onClick={() => setIngredients((current) => [...current, createIngredient()])}
                      className="inline-flex items-center justify-center rounded-3xl bg-slate-800/90 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-700/80"
                    >
                      + Add Ingredient
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-300">Upload pantry photo</label>
                    <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-400">Gemini Vision</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                    <label className="flex cursor-pointer flex-col rounded-3xl border border-dashed border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300 transition hover:border-slate-400">
                      <span className="mb-2 flex items-center gap-2 text-slate-200">
                        <UploadCloud className="h-4 w-4" /> Select image
                      </span>
                      <span className="text-xs text-slate-500">PNG, JPG, JPEG, WEBP</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedImage(file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleParseImage}
                      disabled={!selectedImage || isLoading}
                      className="inline-flex items-center justify-center rounded-3xl bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Parse image
                    </button>
                  </div>
                  {selectedImage ? (
                    <p className="text-xs text-slate-400">Selected file: {selectedImage.name}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Upload a pantry image to auto-fill ingredients.</p>
                  )}
                </div>

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                  <label className="text-sm font-semibold text-slate-300">Choose cuisine</label>
                  <div className="flex flex-wrap gap-3 md:gap-4">
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
                          className={`inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm sm:text-base font-medium transition ${
                            active
                              ? 'border-cyan-400/30 bg-cyan-400/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                              : 'border-white/10 bg-slate-800/70 text-slate-200 hover:-translate-y-0.5 hover:bg-slate-700/80 hover:border-slate-500'
                          }`}
                        >
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950/80 text-xl shadow-inner">
                            {cuisine.emoji}
                          </span>
                          <span className="tracking-wide">{cuisine.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {mode === 'single_meal' ? (
                  <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                    <label className="text-sm font-semibold text-slate-300">Meal type</label>
                    <select
                      value={mealType}
                      onChange={(event) => setMealType(event.target.value)}
                      className="w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-300">Your Daily Macro Targets</label>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isLoading}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      {isLoading ? 'Updating...' : 'Save Profile'}
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Calories
                      <input
                        type="number"
                        value={targetCalories}
                        onChange={(event) => setTargetCalories(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 focus:border-indigo-400 focus:outline-none transition"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Protein (g)
                      <input
                        type="number"
                        value={targetProtein}
                        onChange={(event) => setTargetProtein(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 focus:border-indigo-400 focus:outline-none transition"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Carbs (g)
                      <input
                        type="number"
                        value={targetCarbs}
                        onChange={(event) => setTargetCarbs(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 focus:border-indigo-400 focus:outline-none transition"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      Target Fat (g)
                      <input
                        type="number"
                        value={targetFat}
                        onChange={(event) => setTargetFat(Number(event.target.value))}
                        className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 focus:border-indigo-400 focus:outline-none transition"
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
            
            <div className="space-y-6">
              {dailySummary && (
                <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Daily Tracker</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Remaining Macros</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: 'Calories', val: dailySummary.remaining.calories, color: 'text-sky-300' },
                      { label: 'Protein', val: `${dailySummary.remaining.protein}g`, color: 'text-indigo-300' },
                      { label: 'Carbs', val: `${dailySummary.remaining.carbs}g`, color: 'text-amber-300' },
                      { label: 'Fat', val: `${dailySummary.remaining.fat}g`, color: 'text-rose-300' }
                    ].map(macro => (
                      <div key={macro.label} className="flex flex-col items-center justify-center rounded-2xl bg-slate-950/70 p-4 border border-white/5">
                        <span className={`text-xl font-bold ${macro.color}`}>{macro.val}</span>
                        <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{macro.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

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
                      ].map((item) => {
                        const unit = item.label !== 'Calories' ? 'g' : ' kcal';
                        const isOverFat = item.label === 'Fat' && item.delta > 0;
                        const deltaColor = isOverFat
                          ? 'text-amber-400 font-medium'
                          : item.delta > 0
                          ? 'text-emerald-300'
                          : item.delta < 0
                          ? 'text-rose-300'
                          : 'text-slate-400';
                        const deltaText = item.delta > 0
                          ? `+${item.delta}${unit}`
                          : item.delta < 0
                          ? `${item.delta}${unit}`
                          : `Match`;

                        return (
                          <div key={item.label} className="rounded-2xl bg-slate-900/80 p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-400">{item.label}</span>
                              <span className={`text-xs ${deltaColor}`}>{deltaText}</span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-xl font-bold text-slate-200">{item.actual}</span>
                              <span className="text-xs text-slate-500">/ {item.target}{unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{mode === 'full_day' ? 'Daily Meal Plan' : 'The Recipe'}</p>
                <div className="flex items-center gap-4">
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {mode === 'full_day'
                      ? `Full Day Plan — ${meals?.length ? meals.length : 0} Meal${meals?.length !== 1 ? 's' : ''}`
                      : 'Single Meal Plan'}
                  </h2>
                  {mode === 'single_meal' && recipe && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveMeal(recipe)}
                        disabled={isSaving[recipe.name]}
                        className={`mt-2 flex items-center gap-2 rounded-2xl px-4 py-1.5 text-sm font-semibold transition ${
                          savedStatus[recipe.name]
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                        }`}
                      >
                        {savedStatus[recipe.name] ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Saved
                          </>
                        ) : isSaving[recipe.name] ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          'Save Meal'
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleLogMeal(recipe)}
                        disabled={isLogging[recipe.name]}
                        className={`mt-2 flex items-center gap-2 rounded-2xl px-4 py-1.5 text-sm font-semibold transition ${
                          loggedStatus[recipe.name]
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                        }`}
                      >
                        {loggedStatus[recipe.name] ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Logged
                          </>
                        ) : isLogging[recipe.name] ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Logging
                          </>
                        ) : (
                          'Log to Today'
                        )}
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="mt-2 flex items-center gap-2 rounded-2xl bg-rose-500/20 px-4 py-1.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">High protein</div>
            </div>

            {mode === 'full_day' ? (
              <div className="mt-8 space-y-6">
                {meals.length ? (
                  meals.map((meal: any) => (
                    <div key={`${meal.meal_type}-${meal.name}`} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">{meal.meal_type}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-xl font-semibold text-white">{meal.title || meal.name}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveMeal(meal)}
                                disabled={isSaving[meal.name]}
                                className={`flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-semibold transition ${
                                  savedStatus[meal.name]
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                                }`}
                              >
                                {savedStatus[meal.name] ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Saved
                                  </>
                                ) : isSaving[meal.name] ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Saving
                                  </>
                                ) : (
                                  'Save Meal'
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleLogMeal(meal)}
                                disabled={isLogging[meal.name]}
                                className={`flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-semibold transition ${
                                  loggedStatus[meal.name]
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                                }`}
                              >
                                {loggedStatus[meal.name] ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Logged
                                  </>
                                ) : isLogging[meal.name] ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Logging
                                  </>
                                ) : (
                                  'Log to Today'
                                )}
                              </button>
                              <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition disabled:opacity-50"
                              >
                                <Sparkles className="h-3 w-3" />
                                Regenerate
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-3xl bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                          {meal.macro_fit.calories_achieved} kcal • {meal.macro_fit.protein_achieved}g P
                        </div>
                      </div>
                      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                          <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">Ingredients</h3>
                          <ul className="mt-4 space-y-3 text-slate-200">
                            {(meal.ingredients ?? []).map((ingredient: any, index: number) => (
                              <li key={`${ingredient.name}-${index}`} className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3">
                                <div className="flex items-center justify-between gap-4">
                                  <span>{ingredient.name}</span>
                                  <span className="text-sm text-slate-400">{ingredient.amount} {ingredient.unit}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                          <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">Instructions</h3>
                          <ol className="mt-4 space-y-3 text-slate-200">
                            {(meal.instructions ?? []).map((step: string, index: number) => (
                              <li key={`${meal.meal_type}-${index}`} className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                                <span className="font-semibold text-slate-100">Step {index + 1}:</span> <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/20 bg-slate-900/80 p-6 text-slate-500">
                    Generate a full-day meal plan to see each meal breakdown.
                  </div>
                )}
              </div>
            ) : (
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
            )}
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
                {receipt.missing.map((item: any) => {
                  const showStoreBadge = receipt.store.includes(' & ');
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0">
                      <div>
                        <p className="text-sm text-slate-300">{item.name}</p>
                        {showStoreBadge ? (
                          <p className="text-xs text-slate-500">Best price at {item.store}</p>
                        ) : null}
                      </div>
                      <p className="font-semibold text-white">€{item.price.toFixed(2)}</p>
                    </div>
                  );
                })}
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
      {isSavedMealsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">Your Saved Meals</h2>
                <p className="mt-1 text-sm text-slate-400">Recipes you've logged and saved for later.</p>
              </div>
              <button
                onClick={() => setIsSavedMealsOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {savedMeals.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-slate-950/50 p-12 text-center text-slate-500">
                You haven't saved any meals yet. Generate a recipe and click "Save Meal" to see it here!
              </div>
            ) : (
              <div className="space-y-6">
                {savedMeals.map((meal: any, idx: number) => (
                  <div key={idx} className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">{meal.meal_type || 'Custom'}</h3>
                        <p className="mt-1 text-xl font-semibold text-white">{meal.title || meal.name}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleLogMeal(meal)}
                            disabled={isLogging[meal.name]}
                            className={`flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-semibold transition ${
                              loggedStatus[meal.name]
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                            }`}
                          >
                            {loggedStatus[meal.name] ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Logged
                              </>
                            ) : isLogging[meal.name] ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Logging
                              </>
                            ) : (
                              'Log to Today'
                              )}
                            </button>
                            <button
                              onClick={handleGenerate}
                              disabled={isLoading}
                              className="flex items-center gap-2 rounded-2xl px-3 py-1 text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition disabled:opacity-50"
                            >
                              <Sparkles className="h-3 w-3" />
                              Regenerate
                            </button>
                          </div>
                      </div>
                      <div className="rounded-3xl bg-slate-900/80 px-4 py-2 text-sm text-slate-300">
                        {meal.macro_fit?.calories_achieved || 0} kcal • {meal.macro_fit?.protein_achieved || 0}g P
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
