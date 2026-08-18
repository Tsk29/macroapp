'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, CheckCircle2, Loader2, Sparkles,
  UploadCloud, X, UtensilsCrossed, Flame, Dumbbell,
  Wheat, Droplets, LogOut, BookMarked, RefreshCw, Plus, Minus,
  ShoppingCart, Zap, ArrowLeftRight
} from 'lucide-react';
import { useNutritionAgent } from './hooks';

const allCuisines = [
  { name: 'Mediterranean', emoji: '🥗' },
  { name: 'Italian',       emoji: '🍝' },
  { name: 'Mexican',       emoji: '🌮' },
  { name: 'Asian',         emoji: '🍜' },
  { name: 'American',      emoji: '🥩' },
  { name: 'Indian',        emoji: '🍛' },
  { name: 'Chinese',       emoji: '🥡' },
];

type IngredientInput = { id: string; name: string; amount: number; unit: 'g' | 'ml' | 'whole' };

const createIngredient = (): IngredientInput => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  amount: 0,
  unit: 'g',
});

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎', other: '🥄',
};
const MEAL_TIMES: Record<string, string> = {
  breakfast: '8:00 AM', lunch: '12:30 PM', dinner: '7:00 PM', snack: '3:00 PM', other: '—',
};
const MEAL_FOOD_EMOJIS: Record<string, string> = {
  breakfast: '🥣', lunch: '🥗', dinner: '🍽️', snack: '🍇', other: '🍴',
};

// ── Week calendar helpers ────────────────────────────────────────────────────
function getWeekDays(today: Date) {
  const days = [];
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── MacroRing ────────────────────────────────────────────────────────────────
function MacroRing({ pct, color, label, value }: { pct: number; color: string; label: string; value: string }) {
  const r = 28; const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(45,85,54,0.10)" strokeWidth="8" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{value}</div>
        <div className="text-xs" style={{ color: 'var(--sage)' }}>{label}</div>
      </div>
    </div>
  );
}

// ── MacroPie — SVG donut chart for recipe macros ──────────────────────────────
function MacroPie({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = (protein * 4) + (carbs * 4) + (fat * 9);
  if (total <= 0) return null;
  const protCal = protein * 4;
  const carbCal = carbs * 4;
  const fatCal  = fat * 9;
  const slices = [
    { label: 'Protein', value: protCal, color: '#0ea5e9', grams: protein, unit: 'g' },
    { label: 'Carbs',   value: carbCal, color: '#f59e0b', grams: carbs,   unit: 'g' },
    { label: 'Fat',     value: fatCal,  color: '#ef4444', grams: fat,     unit: 'g' },
  ];
  const cx = 60; const cy = 60; const r = 44; const hole = 26;
  let angle = -Math.PI / 2;
  const paths = slices.map(s => {
    const frac = s.value / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const lf = sweep > Math.PI ? 1 : 0;
    const xi1 = cx + hole * Math.cos(angle);
    const yi1 = cy + hole * Math.sin(angle);
    const xi2 = cx + hole * Math.cos(angle - sweep);
    const yi2 = cy + hole * Math.sin(angle - sweep);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${lf} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${hole} ${hole} 0 ${lf} 0 ${xi2} ${yi2} Z`;
    return { ...s, d, pct: Math.round(frac * 100) };
  });
  return (
    <div style={{ marginTop: 20 }}>
      <div className="section-label mb-3">Macro Distribution</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} opacity={0.85}>
              <title>{p.label}: {p.pct}%</title>
            </path>
          ))}
          <text x="60" y="55" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text-sub)', fontWeight: 600 }}>{total}</text>
          <text x="60" y="69" textAnchor="middle" style={{ fontSize: 9, fill: 'var(--sage)' }}>kcal</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paths.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--sage)' }}>{p.grams}g · {p.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LoginPage ────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onRegister, error, isLoading }: {
  onLogin: (u:string, p:string) => void;
  onRegister: (u:string, p:string) => void;
  error: string | null;
  isLoading: boolean;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isReg, setIsReg] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #eef7f1 0%, #c5e1cf 100%)' }}>
      <div className="glass-card fade-up w-full max-w-md p-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #2d5536, #4a8856)' }}>
            <span className="text-3xl">🥗</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
            {isReg ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--sage)' }}>
            {isReg ? 'Start tracking your daily macros.' : 'Sign in to your nutrition dashboard.'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-sub)' }}>Username</label>
            <input className="field" placeholder="e.g. tharun" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-sub)' }}>Password</label>
            <input className="field" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (isReg ? onRegister(username, password) : onLogin(username, password))} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            className="pill-btn pill-btn-green w-full mt-2"
            disabled={isLoading}
            onClick={() => isReg ? onRegister(username, password) : onLogin(username, password)}
          >
            {isLoading ? <Loader2 className="h-4 w-4 spin" /> : <ArrowRight className="h-4 w-4" />}
            {isReg ? 'Sign Up' : 'Sign In'}
          </button>
          <button onClick={() => setIsReg(!isReg)}
            className="w-full text-center text-sm"
            style={{ color: 'var(--sage)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {isReg ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => getWeekDays(today), [today]);
  const [activeDay, setActiveDay] = useState(today.getDate());

  const [ingredients, setIngredients] = useState<IngredientInput[]>(() => [createIngredient()]);
  const [mode, setMode] = useState<'single_meal' | 'full_day'>('single_meal');
  const [mealType, setMealType] = useState('Lunch');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Mediterranean']);
  const [targetCalories, setTargetCalories] = useState(1900);
  const [targetProtein, setTargetProtein]   = useState(130);
  const [targetCarbs, setTargetCarbs]       = useState(180);
  const [targetFat, setTargetFat]           = useState(60);

  const {
    state, isLoading, error,
    generateRecipe, parsePantryImage, saveMeal, fetchSavedMeals,
    login, register, updateProfile, logDailyMeal, fetchDailySummary, fetchWeeklySummary, aiSwap,
  } = useNutritionAgent();

  const [swapReason, setSwapReason]         = useState('vegetarian');
  const [isSwapping, setIsSwapping]         = useState(false);
  const [cartCopied, setCartCopied]         = useState(false);
  const [dailyCartCopied, setDailyCartCopied] = useState(false);
  const [showSwapMenu, setShowSwapMenu]     = useState(false);

  const [isSavedMealsOpen, setIsSavedMealsOpen] = useState(false);
  const [savedMeals, setSavedMeals]           = useState<any[]>([]);
  const [isSaving, setIsSaving]               = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus]         = useState<Record<string, boolean>>({});
  const [userProfile, setUserProfile]         = useState<any>(null);
  const [dailySummary, setDailySummary]       = useState<any>(null);
  const [weeklyData, setWeeklyData]           = useState<any[]>([]);
  const [isLogging, setIsLogging]             = useState<Record<string, boolean>>({});
  const [loggedStatus, setLoggedStatus]       = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage]     = useState<File | null>(null);
  const [activeTab, setActiveTab]             = useState<'build' | 'diary' | 'stats'>('build');

  const meals = useMemo(() => {
    if (mode === 'full_day') return state?.meal_plan?.meals ?? [];
    return state?.generated_recipe ? [state.generated_recipe] : [];
  }, [mode, state]);

  const recipe = useMemo(() => meals[0] ?? undefined, [meals]);

  const receipt = useMemo(() => {
    if (state?.scraper_results?.items?.length) {
      const stores = Array.from(new Set(state.scraper_results.items.map((i: any) => i.store)));
      return {
        missing: state.scraper_results.items,
        total: state.scraper_results.total_cost ?? 0,
        store: stores.length > 1 ? stores.join(' & ') : stores[0] ?? 'Unknown',
        cheapest: state.scraper_results.cheapest_store_overall ?? 'Unknown',
      };
    }
    return { missing: [], total: 0, store: 'None', cheapest: 'None' };
  }, [state]);

  const recipeInstructions = useMemo(() => {
    if (!recipe) return [];
    if (Array.isArray(recipe.instructions)) return recipe.instructions;
    return String(recipe.instructions).split(/\n+/).map((l: string) => l.trim()).filter(Boolean);
  }, [recipe]);

  const macroFit = useMemo(() => recipe?.macro_fit ?? {
    calories_target: targetCalories, calories_achieved: 0, calories_delta: 0,
    protein_target: targetProtein,   protein_achieved: 0,  protein_delta: 0,
    carbs_target: targetCarbs,       carbs_achieved: 0,    carbs_delta: 0,
    fat_target: targetFat,           fat_achieved: 0,      fat_delta: 0,
    match_score_percentage: 0,
  }, [recipe, targetCalories, targetProtein, targetCarbs, targetFat]);

  const categorizedMeals = useMemo(() => {
    const mls = dailySummary?.meals || [];
    return {
      Breakfast: mls.filter((m: any) => m.meal_type?.toLowerCase() === 'breakfast'),
      Lunch:     mls.filter((m: any) => m.meal_type?.toLowerCase() === 'lunch'),
      Dinner:    mls.filter((m: any) => m.meal_type?.toLowerCase() === 'dinner'),
      Snacks:    mls.filter((m: any) => m.meal_type?.toLowerCase() === 'snack'),
      Other:     mls.filter((m: any) => !['breakfast','lunch','dinner','snack'].includes(m.meal_type?.toLowerCase())),
    };
  }, [dailySummary]);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) setUserProfile(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      setTargetCalories(userProfile.target_calories);
      setTargetProtein(userProfile.target_protein);
      setTargetCarbs(userProfile.target_carbs);
      setTargetFat(userProfile.target_fat);
      fetchDailySummary(userProfile.username, getTodayString()).then(setDailySummary);
      // Fetch weekly data — start from Monday of this week
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const weekStart = monday.toISOString().split('T')[0];
      fetchWeeklySummary(userProfile.username, weekStart).then(d => {
        if (d?.days) setWeeklyData(d.days);
      });
    }
  }, [userProfile]);

  // Re-fetch diary when user switches calendar day
  useEffect(() => {
    if (!userProfile) return;
    const d = weekDays.find(d => d.getDate() === activeDay);
    if (!d) return;
    const dateStr = d.toISOString().split('T')[0];
    fetchDailySummary(userProfile.username, dateStr).then(setDailySummary);
  }, [activeDay]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleParseImage() {
    if (!selectedImage) return;
    const parsed = await parsePantryImage(selectedImage);
    if (!parsed || !Array.isArray(parsed)) return;
    setIngredients(cur => [...cur, ...parsed.map((i: any) => ({
      id: i.id || createIngredient().id, name: i.name || '', amount: i.amount ?? 0, unit: i.unit || 'g',
    }))]);
    setSelectedImage(null);
  }

  async function handleLogin(u: string, p: string) {
    if (!u.trim() || !p.trim()) return;
    const profile = await login(u.trim(), p.trim());
    if (profile) setUserProfile(profile);
  }

  async function handleRegister(u: string, p: string) {
    if (!u.trim() || !p.trim()) return;
    const profile = await register(u.trim(), p.trim());
    if (profile) setUserProfile(profile);
  }

  function handleLogout() {
    localStorage.removeItem('userProfile');
    setUserProfile(null);
  }

  async function handleLogMeal(recipeToLog: any) {
    if (!userProfile || !recipeToLog) return;
    setIsLogging(prev => ({ ...prev, [recipeToLog.name]: true }));
    // Pass current Rewe shopping snapshot so cost is persisted with this meal log
    const shoppingCost  = state?.scraper_results?.total_cost   ?? 0;
    const shoppingItems = (state?.scraper_results?.items ?? []).map((i: any) => ({ name: i.name, store: i.store, price: i.price }));
    const result = await logDailyMeal(userProfile.username, getTodayString(), recipeToLog, shoppingCost, shoppingItems);
    if (result) {
      setLoggedStatus(prev => ({ ...prev, [recipeToLog.name]: true }));
      const d = weekDays.find(d => d.getDate() === activeDay);
      const dateStr = d ? d.toISOString().split('T')[0] : getTodayString();
      const newSummary = await fetchDailySummary(userProfile.username, dateStr);
      setDailySummary(newSummary);
    }
    setIsLogging(prev => ({ ...prev, [recipeToLog.name]: false }));
  }

  async function handleGenerate() {
    const ac = dailySummary ? dailySummary.remaining.calories : targetCalories;
    const ap = dailySummary ? dailySummary.remaining.protein  : targetProtein;
    const ach = dailySummary ? dailySummary.remaining.carbs   : targetCarbs;
    const af = dailySummary ? dailySummary.remaining.fat      : targetFat;
    await generateRecipe({
      user_prompt: ingredients.map(i => i.name).filter(Boolean).join(', '),
      mode, meal_type: mealType, cuisine_preference: selectedCuisines,
      target_calories: ac, target_protein: ap, target_carbs: ach, target_fat: af, ingredients,
    });
    setLoggedStatus({});
    setSavedStatus({});
    setShowSwapMenu(false);
    setActiveTab('build');
  }

  async function handleAiSwap(r: any) {
    if (!r) return;
    setIsSwapping(true);
    setShowSwapMenu(false);
    await aiSwap({
      recipe: r,
      reason: swapReason,
      cuisine_preference: selectedCuisines,
      meal_type: mealType,
      target_calories: dailySummary ? dailySummary.remaining.calories : targetCalories,
      target_protein:  dailySummary ? dailySummary.remaining.protein  : targetProtein,
      target_carbs:    dailySummary ? dailySummary.remaining.carbs    : targetCarbs,
      target_fat:      dailySummary ? dailySummary.remaining.fat      : targetFat,
    });
    setIsSwapping(false);
    setSavedStatus({});
    setLoggedStatus({});
  }

  function handleReweCart() {
    const items = state?.scraper_results?.items ?? [];
    const missing = recipe?.missing_ingredients ?? [];
    const lines: string[] = [];
    if (items.length > 0) {
      items.forEach((it: any) => lines.push(`${it.name} — €${(it.price ?? 0).toFixed(2)}${it.store ? ' @ ' + it.store : ''}`));
    } else {
      missing.forEach((n: string) => lines.push(n));
    }
    if (lines.length === 0) return;
    const text = `🛒 REWE Shopping List:\n` + lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCartCopied(true);
      setTimeout(() => setCartCopied(false), 3000);
    });
    // Open REWE search in new tab for first item
    const first = items[0]?.name || missing[0];
    if (first) window.open(`https://www.rewe.de/search/?search=${encodeURIComponent(first)}`, '_blank');
  }

  function handleDailyReweCart() {
    const items = dailySummary?.shopping_items ?? [];
    if (items.length === 0) return;
    const lines: string[] = [];
    items.forEach((it: any) => lines.push(`${it.name} — €${(it.price ?? 0).toFixed(2)}${it.store ? ' @ ' + it.store : ''}`));
    const text = `🛒 Daily REWE Shopping List:\n` + lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setDailyCartCopied(true);
      setTimeout(() => setDailyCartCopied(false), 3000);
    });
    const first = items[0]?.name;
    if (first) window.open(`https://www.rewe.de/search/?search=${encodeURIComponent(first)}`, '_blank');
  }

  async function handleSaveMeal(recipeToSave: any) {
    if (!recipeToSave || savedStatus[recipeToSave.name]) return;
    setIsSaving(prev => ({ ...prev, [recipeToSave.name]: true }));
    const result = await saveMeal(recipeToSave);
    if (result) setSavedStatus(prev => ({ ...prev, [recipeToSave.name]: true }));
    setIsSaving(prev => ({ ...prev, [recipeToSave.name]: false }));
  }

  async function handleUpdateProfile() {
    if (!userProfile) return;
    const profile = { username: userProfile.username, target_calories: targetCalories,
      target_protein: targetProtein, target_carbs: targetCarbs, target_fat: targetFat };
    await updateProfile(profile);
    setUserProfile(profile);
  }

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!userProfile) {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} error={error} isLoading={isLoading} />;
  }

  // ── Macro progress percentages ───────────────────────────────────────────────
  const consumed = dailySummary?.consumed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const calPct  = Math.min((consumed.calories / (targetCalories || 1)) * 100, 100);
  const protPct = Math.min((consumed.protein  / (targetProtein  || 1)) * 100, 100);
  const carbPct = Math.min((consumed.carbs    / (targetCarbs    || 1)) * 100, 100);
  const fatPct  = Math.min((consumed.fat      / (targetFat      || 1)) * 100, 100);

  const monthLabel = `${MONTH_LABELS[today.getMonth()]} ${today.getFullYear()}`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #eef7f1 0%, #c8e2d2 60%, #b3d6bf 100%)' }}>

      {/* ── Header ── */}
      <header className="glass-card mx-auto mt-4 flex max-w-7xl items-center justify-between px-6 py-3"
        style={{ borderRadius: '20px', margin: '16px auto', maxWidth: '1380px' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #2d5536, #4a8856)' }}>
            <span className="text-lg">🥗</span>
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: 'var(--text-main)' }}>NutriPlan</div>
            <div className="text-xs" style={{ color: 'var(--sage)' }}>Hi, {userProfile.username} 👋</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {([['build','🍳','Build'], ['diary','📓','My Diary'], ['stats','📊','Progress']] as const).map(([tab, emoji, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="pill-btn px-4 py-2 text-sm"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg,#2d5536,#4a8856)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-sub)',
                borderRadius: '12px',
                border: 'none',
              }}>
              {emoji} {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={async () => { setIsSavedMealsOpen(true); const m = await fetchSavedMeals(); setSavedMeals(m); }}
            className="pill-btn pill-btn-outline text-sm" style={{ padding: '8px 16px' }}>
            <BookMarked className="h-3.5 w-3.5" /> Saved
          </button>
          <button onClick={handleLogout} className="pill-btn text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#991b1b', border: 'none', padding: '8px 16px', borderRadius: '12px' }}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* ── Weekly Calendar Strip ── */}
      <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '0 16px' }}>
        <div className="glass-card mt-4 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>{monthLabel}</span>
            <span className="section-label">{dailySummary ? `${dailySummary.meals?.length || 0} meals today` : 'No meals logged'}</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const isActive = d.getDate() === activeDay;
              return (
                <button key={i} onClick={() => setActiveDay(d.getDate())}
                  className={`cal-day ${isActive ? 'active' : ''}`}
                  style={!isActive ? { color: 'var(--text-sub)' } : {}}>
                  <span className="day-label">{DAY_LABELS[d.getDay()]}</span>
                  <span className="day-num">{d.getDate()}</span>
                  {isToday && !isActive && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green-400)', display: 'block', marginTop: 2 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <main style={{ maxWidth: '1380px', margin: '16px auto 32px', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' }}>

          {/* ══ LEFT PANEL ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Macro overview rings */}
            <div className="glass-card p-5">
              <div className="section-label mb-4">Today's Progress</div>
              <div className="flex items-center justify-around">
                <MacroRing pct={calPct}  color="#4a8856" label="Calories" value={`${consumed.calories} kcal`} />
                <MacroRing pct={protPct} color="#0ea5e9" label="Protein"  value={`${consumed.protein}g`} />
                <MacroRing pct={carbPct} color="#f59e0b" label="Carbs"    value={`${consumed.carbs}g`} />
                <MacroRing pct={fatPct}  color="#ef4444" label="Fat"      value={`${consumed.fat}g`} />
              </div>

              {dailySummary && (
                <div className="mt-4 space-y-2">
                  {[
                    { label: 'Calories', remaining: dailySummary.remaining.calories, target: targetCalories, color: '#4a8856', unit: 'kcal' },
                    { label: 'Protein',  remaining: dailySummary.remaining.protein,  target: targetProtein,  color: '#0ea5e9', unit: 'g' },
                    { label: 'Carbs',    remaining: dailySummary.remaining.carbs,    target: targetCarbs,    color: '#f59e0b', unit: 'g' },
                    { label: 'Fat',      remaining: dailySummary.remaining.fat,      target: targetFat,      color: '#ef4444', unit: 'g' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--text-sub)' }}>{m.label}</span>
                        <span style={{ color: m.remaining > 0 ? m.color : '#ef4444', fontWeight: 600 }}>
                          {m.remaining > 0 ? `${m.remaining} ${m.unit} left` : 'Goal hit! 🎉'}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill"
                          style={{ width: `${Math.min(((m.target - Math.max(m.remaining,0)) / m.target) * 100, 100)}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Diary */}
            <div className="glass-card p-5" style={{ flex: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="section-label">Daily Diary</div>
                <span className="badge badge-green">{dailySummary?.meals?.length || 0} logged</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(['Breakfast','Lunch','Dinner','Snacks'] as const).map(cat => {
                  const catMeals = categorizedMeals[cat];
                  const catKey   = cat.toLowerCase().replace('snacks','snack');
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-2">
                        <span>{MEAL_EMOJIS[catKey] || '🥄'}</span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>{cat}</span>
                        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--sage)' }}>{MEAL_TIMES[catKey]}</span>
                      </div>
                      {catMeals.length === 0 ? (
                        <div className="diary-entry text-xs" style={{ color: 'var(--sage)', textAlign:'center', borderStyle:'dashed', borderColor:'rgba(45,85,54,0.2)' }}>
                          No {cat.toLowerCase()} logged
                        </div>
                      ) : catMeals.map((meal: any, idx: number) => (
                        <div key={idx} className="diary-entry mb-1.5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                              style={{ background: 'rgba(45,85,54,0.10)' }}>
                              {MEAL_FOOD_EMOJIS[catKey] || '🍴'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                                {meal.title || meal.name}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="badge badge-green text-xs" style={{ padding:'1px 7px' }}>
                                  <Flame className="h-2.5 w-2.5" /> {meal.macro_fit?.calories_achieved || 0} kcal
                                </span>
                                <span className="badge badge-sky text-xs" style={{ padding:'1px 7px' }}>
                                  <Dumbbell className="h-2.5 w-2.5" /> {meal.macro_fit?.protein_achieved || 0}g P
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Rewe Daily Shopping Things to Buy box */}
              {dailySummary && dailySummary.shopping_items && dailySummary.shopping_items.length > 0 && (
                <div className="mt-6 glass-card p-4 fade-up" style={{ border: '1px solid rgba(45,85,54,0.15)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="section-label mb-0.5">🛒 Things to Buy</div>
                      <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                        End of day missing ingredients
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--sage)' }}>Total estimate</div>
                      <div className="text-lg font-bold" style={{ color: 'var(--green-700)' }}>€{dailySummary.total_shopping_cost.toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {dailySummary.shopping_items.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'rgba(255,255,255,0.4)', padding: '6px 10px', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-600)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {item.store && <span style={{ fontSize: 10, background: 'rgba(45,85,54,0.1)', padding: '2px 6px', borderRadius: 10, color: 'var(--sage)' }}>{item.store}</span>}
                          <span style={{ fontWeight: 700, color: 'var(--text-sub)' }}>€{(item.price ?? 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleDailyReweCart}
                    className="pill-btn w-full"
                    style={{ background: 'linear-gradient(135deg, var(--green-600), var(--green-700))', color: 'white', padding: '10px', border: 'none' }}>
                    {dailyCartCopied ? <><CheckCircle2 className="h-4 w-4" /> Copied! Opening REWE…</> : <><ShoppingCart className="h-4 w-4" /> 🛒 Buy All on REWE</>}
                  </button>
                </div>
              )}
            </div>

            {/* ── Rewe Shopping List (live, from current generated recipe) ── */}
            {(receipt.missing.length > 0 || (recipe?.missing_ingredients?.length ?? 0) > 0) && (
              <div className="glass-card p-5 fade-up">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="section-label mb-0.5">🛒 Rewe Shopping List</div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                      Ingredients to buy
                    </h3>
                  </div>
                  {receipt.total > 0 && (
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--sage)' }}>Total estimate</div>
                      <div className="text-lg font-bold" style={{ color: 'var(--green-700)' }}>€{receipt.total.toFixed(2)}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* If we have Rewe price data, show with prices */}
                  {receipt.missing.length > 0 ? (
                    receipt.missing.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm"
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: 12, color: 'var(--text-sub)' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--sage)', fontSize: 16 }}>🛒</span>
                          <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{item.name}</span>
                          {item.store && (
                            <span className="badge badge-green" style={{ padding: '1px 6px', fontSize: 9 }}>{item.store}</span>
                          )}
                        </div>
                        <span className="font-bold" style={{ color: 'var(--green-700)' }}>
                          €{(item.price ?? 0).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    /* Fallback: show missing ingredient names without prices */
                    (recipe?.missing_ingredients ?? []).map((name: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm"
                        style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
                        <span style={{ color: 'var(--sage)', fontSize: 14 }}>🛒</span>
                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{name}</span>
                        <span className="badge badge-sky" style={{ marginLeft: 'auto', padding: '1px 8px', fontSize: 9 }}>to buy</span>
                      </div>
                    ))
                  )}

                  {receipt.total > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
                      <div className="flex items-center justify-between"
                        style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#2d5536,#4a8856)', borderRadius: 14, color: '#fff', fontWeight: 700 }}>
                        <span>Total from {String(receipt.store ?? 'Rewe')}</span>
                        <span>€{receipt.total.toFixed(2)}</span>
                      </div>
                      {/* ── One-click REWE Cart ── */}
                      <button onClick={handleReweCart}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'10px 14px', background: cartCopied ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'rgba(14,165,233,0.12)', border:'1.5px solid rgba(14,165,233,0.30)', borderRadius:14, cursor:'pointer', fontWeight:600, fontSize:13, color: cartCopied ? '#fff' : '#0369a1', transition:'all 0.3s' }}>
                        {cartCopied ? <><CheckCircle2 className="h-4 w-4" /> Copied! Opening REWE…</> : <><ShoppingCart className="h-4 w-4" /> 🛒 One-Click REWE Cart</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ══ RIGHT PANEL ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Weekly Compliance Bar Chart */}
            {weeklyData.length > 0 && (
              <div className="glass-card p-5 fade-up">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="section-label mb-1">This Week</div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Macro Compliance</h3>
                  </div>
                  <span className="badge badge-green">
                    {Math.round(weeklyData.filter(d => d.compliance >= 60).length / 7 * 100)}% days on track
                  </span>
                </div>
                <div className="flex items-end justify-between gap-2" style={{ height: 100 }}>
                  {weeklyData.map((day: any, i: number) => {
                    const pct = day.compliance;
                    const color = pct >= 90 ? '#4a8856' : pct >= 60 ? '#f59e0b' : pct > 0 ? '#ef4444' : 'rgba(45,85,54,0.15)';
                    const label = DAY_LABELS[new Date(day.date + 'T12:00:00').getDay()];
                    const isToday = day.date === getTodayString();
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        {pct > 0 && (
                          <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                        )}
                        <div className="w-full rounded-xl relative overflow-hidden" style={{ height: 64, background: 'rgba(45,85,54,0.08)' }}>
                          <div className="absolute bottom-0 left-0 right-0 rounded-xl transition-all"
                            style={{ height: `${Math.max(pct, 4)}%`, background: color, opacity: pct > 0 ? 1 : 0.3 }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: isToday ? 'var(--green-600)' : 'var(--sage)', fontWeight: isToday ? 700 : 500 }}>{label}</span>
                        {day.meal_count > 0 && <span className="text-xs" style={{ color: 'var(--sage)' }}>{day.meal_count}🍽</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Build tab */}
            <div className="glass-card p-6">
              {/* Tabs (mobile) */}
              <div className="flex md:hidden gap-2 mb-6">
                {([['build','🍳','Build'], ['diary','📓','Diary'], ['stats','📊','Stats']] as const).map(([tab,e,l]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="pill-btn flex-1 text-sm"
                    style={{ padding:'8px', background: activeTab===tab ? 'linear-gradient(135deg,#2d5536,#4a8856)' : 'rgba(255,255,255,0.6)', color: activeTab===tab ? '#fff' : 'var(--text-sub)', border:'none', borderRadius:12 }}>
                    {e} {l}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="section-label mb-1">Meal Setup</div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Build Your Recipe</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#2d5536,#4a8856)' }}>
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Mode toggle */}
              <div className="mb-4">
                <div className="section-label mb-2">Planning Scope</div>
                <div className="flex gap-2">
                  {[['single_meal','Single Meal'],['full_day','Full Day']].map(([v,l]) => (
                    <button key={v} onClick={() => setMode(v as any)}
                      className="pill-btn flex-1 text-sm"
                      style={{ padding:'10px', background: mode===v ? 'linear-gradient(135deg,#2d5536,#4a8856)' : 'rgba(255,255,255,0.6)', color: mode===v ? '#fff' : 'var(--text-sub)', border: mode===v ? 'none' : '1.5px solid rgba(45,85,54,0.18)', borderRadius:14 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuisine chips */}
              <div className="mb-4">
                <div className="section-label mb-2">Cuisine</div>
                <div className="flex flex-wrap gap-2">
                  {allCuisines.map(c => (
                    <button key={c.name}
                      className={`cuisine-chip ${selectedCuisines.includes(c.name) ? 'active' : ''}`}
                      onClick={() => setSelectedCuisines(cur => cur.includes(c.name) ? cur.filter(x => x !== c.name) : [...cur, c.name])}>
                      <span>{c.emoji}</span> {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal type (single only) */}
              {mode === 'single_meal' && (
                <div className="mb-4">
                  <div className="section-label mb-2">Meal Type</div>
                  <div className="flex gap-2 flex-wrap">
                    {['Breakfast','Lunch','Dinner','Snack'].map(t => (
                      <button key={t} onClick={() => setMealType(t)}
                        className="pill-btn text-sm"
                        style={{ padding:'8px 16px', background: mealType===t ? 'linear-gradient(135deg,#2d5536,#4a8856)' : 'rgba(255,255,255,0.6)', color: mealType===t ? '#fff' : 'var(--text-sub)', border: mealType===t ? 'none' : '1.5px solid rgba(45,85,54,0.18)', borderRadius:12 }}>
                        {MEAL_EMOJIS[t.toLowerCase()]} {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients */}
              <div className="mb-4">
                <div className="section-label mb-2">Ingredients</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {ingredients.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input className="field flex-1" placeholder="e.g. Chicken breast" value={item.name}
                        onChange={e => { const n=[...ingredients]; n[idx]={...n[idx], name:e.target.value}; setIngredients(n); }} />
                      <input type="number" className="field" style={{ width:72, textAlign:'center' }} placeholder="200" value={item.amount||''}
                        onChange={e => { const n=[...ingredients]; n[idx]={...n[idx], amount:Number(e.target.value)}; setIngredients(n); }} />
                      <select className="field" style={{ width:80 }} value={item.unit}
                        onChange={e => { const n=[...ingredients]; n[idx]={...n[idx], unit:e.target.value as any}; setIngredients(n); }}>
                        <option value="g">g</option><option value="ml">ml</option><option value="whole">whole</option>
                      </select>
                      <button onClick={() => setIngredients(cur => cur.filter((_,i) => i!==idx))}
                        style={{ background:'rgba(239,68,68,0.10)', border:'none', borderRadius:12, padding:'8px 10px', cursor:'pointer', color:'#991b1b' }}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setIngredients(cur => [...cur, createIngredient()])}
                    className="pill-btn pill-btn-outline text-sm" style={{ alignSelf:'flex-start', padding:'8px 16px' }}>
                    <Plus className="h-3.5 w-3.5" /> Add Ingredient
                  </button>
                </div>
              </div>

              {/* Pantry image */}
              <div className="mb-4">
                <div className="section-label mb-2">Scan Pantry Photo</div>
                <div className="flex gap-3 items-end">
                  <label className="flex-1 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-4 cursor-pointer"
                    style={{ borderColor:'rgba(45,85,54,0.25)', background:'rgba(255,255,255,0.5)' }}>
                    <UploadCloud className="h-5 w-5" style={{ color:'var(--green-600)' }} />
                    <span className="text-xs" style={{ color:'var(--sage)' }}>{selectedImage ? selectedImage.name : 'PNG, JPG, WEBP'}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => setSelectedImage(e.target.files?.[0] ?? null)} />
                  </label>
                  <button className="pill-btn pill-btn-outline text-sm" style={{ padding:'10px 16px' }}
                    disabled={!selectedImage || isLoading} onClick={handleParseImage}>
                    Parse
                  </button>
                </div>
              </div>

              {/* Macro targets */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="section-label">Daily Macro Targets</div>
                  <button onClick={handleUpdateProfile} disabled={isLoading}
                    className="text-xs font-semibold" style={{ color:'var(--green-600)', background:'none', border:'none', cursor:'pointer' }}>
                    {isLoading ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns:'1fr 1fr' }}>
                  {[
                    { label:'Calories', val:targetCalories, set:setTargetCalories, icon:<Flame className="h-3.5 w-3.5" /> },
                    { label:'Protein g', val:targetProtein, set:setTargetProtein, icon:<Dumbbell className="h-3.5 w-3.5" /> },
                    { label:'Carbs g',   val:targetCarbs,   set:setTargetCarbs,   icon:<Wheat className="h-3.5 w-3.5" /> },
                    { label:'Fat g',     val:targetFat,     set:setTargetFat,     icon:<Droplets className="h-3.5 w-3.5" /> },
                  ].map(m => (
                    <label key={m.label} className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color:'var(--text-sub)' }}>
                        {m.icon} {m.label}
                      </span>
                      <input type="number" className="field" value={m.val}
                        onChange={e => m.set(Number(e.target.value))} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button className="pill-btn pill-btn-green w-full text-base" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 spin" /> : <Sparkles className="h-5 w-5" />}
                {isLoading ? 'Generating…' : 'Generate Recipe'}
              </button>
              {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
            </div>

            {/* ── Recipe / Meal Plan Result ── */}
            {meals.length > 0 && (
              <div className="glass-card p-6 fade-up">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="section-label mb-1">{mode === 'full_day' ? 'Daily Meal Plan' : 'The Recipe'}</div>
                    <h2 className="text-xl font-bold" style={{ color:'var(--text-main)' }}>
                      {mode === 'full_day' ? `${meals.length} Meals Generated` : (recipe?.title || recipe?.name)}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="badge badge-green">
                      <CheckCircle2 className="h-3 w-3" /> {macroFit.match_score_percentage}% Match
                    </span>
                  </div>
                </div>

                {mode === 'full_day' ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {meals.map((meal: any) => (
                      <div key={`${meal.meal_type}-${meal.name}`} className="meal-card">
                        <div className="flex gap-4 p-4">
                          {/* Food emoji image */}
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-4xl"
                            style={{ background: 'linear-gradient(135deg, rgba(45,85,54,0.12), rgba(90,168,110,0.18))' }}>
                            {MEAL_FOOD_EMOJIS[meal.meal_type?.toLowerCase()] || '🍴'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="badge badge-green mb-1" style={{ fontSize:10 }}>{meal.meal_type}</span>
                                <p className="text-base font-bold truncate" style={{ color:'var(--text-main)' }}>{meal.title || meal.name}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="flex items-center gap-1 text-xs" style={{ color:'var(--sage)' }}>
                                    <Flame className="h-3 w-3 text-amber-500" /> {meal.macro_fit?.calories_achieved || 0} kcal
                                  </span>
                                  <span className="flex items-center gap-1 text-xs" style={{ color:'var(--sage)' }}>
                                    <Dumbbell className="h-3 w-3 text-sky-500" /> {meal.macro_fit?.protein_achieved || 0}g protein
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button onClick={() => handleSaveMeal(meal)} disabled={isSaving[meal.name]}
                                className="badge" style={{ background: savedStatus[meal.name] ? 'rgba(45,85,54,0.15)' : 'rgba(255,255,255,0.8)', color: savedStatus[meal.name] ? '#2d5536' : 'var(--text-sub)', border:'1px solid rgba(45,85,54,0.2)', cursor:'pointer', padding:'5px 12px' }}>
                                {savedStatus[meal.name] ? <><CheckCircle2 className="h-3 w-3" /> Saved</> : isSaving[meal.name] ? <><Loader2 className="h-3 w-3 spin" /> Saving</> : 'Save'}
                              </button>
                              <button onClick={() => handleLogMeal(meal)} disabled={isLogging[meal.name]}
                                className="badge" style={{ background: loggedStatus[meal.name] ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.8)', color: loggedStatus[meal.name] ? '#0369a1' : 'var(--text-sub)', border:'1px solid rgba(14,165,233,0.2)', cursor:'pointer', padding:'5px 12px' }}>
                                {loggedStatus[meal.name] ? <><CheckCircle2 className="h-3 w-3" /> Logged</> : isLogging[meal.name] ? <><Loader2 className="h-3 w-3 spin" /> Logging</> : 'Log to Today'}
                              </button>
                              <button onClick={handleGenerate} disabled={isLoading}
                                className="badge" style={{ background:'rgba(249,115,22,0.10)', color:'#9a3412', border:'1px solid rgba(249,115,22,0.2)', cursor:'pointer', padding:'5px 12px' }}>
                                <RefreshCw className="h-3 w-3" /> Regenerate
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Ingredients + Instructions accordion */}
                        <div style={{ borderTop:'1px solid rgba(45,85,54,0.10)', padding:'12px 16px' }}>
                          <div className="grid gap-4" style={{ gridTemplateColumns:'1fr 1fr' }}>
                            <div>
                              <div className="section-label mb-2">Ingredients</div>
                              <ul style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                {(meal.ingredients ?? []).map((ing: any, i: number) => (
                                  <li key={i} className="flex items-center justify-between text-xs"
                                    style={{ padding:'6px 10px', background:'rgba(45,85,54,0.06)', borderRadius:10, color:'var(--text-sub)' }}>
                                    <span>{ing.name}</span>
                                    <span className="font-medium" style={{ color:'var(--text-main)' }}>{ing.amount}{ing.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="section-label mb-2">Steps</div>
                              <ol style={{ display:'flex', flexDirection:'column', gap:4 }}>
                                {(meal.instructions ?? []).map((step: string, i: number) => (
                                  <li key={i} className="flex gap-2 text-xs" style={{ color:'var(--text-sub)' }}>
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                      style={{ background:'linear-gradient(135deg,#2d5536,#4a8856)', color:'#fff' }}>{i+1}</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recipe && (
                  <div className="meal-card">
                    <div className="flex gap-4 p-5">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl text-5xl"
                        style={{ background:'linear-gradient(135deg, rgba(45,85,54,0.12), rgba(90,168,110,0.18))' }}>
                        {MEAL_FOOD_EMOJIS[recipe.meal_type?.toLowerCase()] || '🍴'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="badge badge-green mb-2" style={{ fontSize:10 }}>{recipe.meal_type || mealType}</span>
                        <p className="text-xl font-bold" style={{ color:'var(--text-main)' }}>{recipe.title || recipe.name}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-sm" style={{ color:'var(--sage)' }}>
                            <Flame className="h-4 w-4 text-amber-500" /> {macroFit.calories_achieved} kcal
                          </span>
                          <span className="flex items-center gap-1 text-sm" style={{ color:'var(--sage)' }}>
                            <Dumbbell className="h-4 w-4 text-sky-500" /> {macroFit.protein_achieved}g protein
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => handleSaveMeal(recipe)} disabled={isSaving[recipe.name]}
                            className="badge" style={{ background: savedStatus[recipe.name] ? 'rgba(45,85,54,0.15)' : 'rgba(255,255,255,0.8)', color: savedStatus[recipe.name] ? '#2d5536' : 'var(--text-sub)', border:'1px solid rgba(45,85,54,0.2)', cursor:'pointer', padding:'6px 14px', fontSize:13 }}>
                            {savedStatus[recipe.name] ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : isSaving[recipe.name] ? <><Loader2 className="h-3.5 w-3.5 spin" /> Saving</> : 'Save Meal'}
                          </button>
                          <button onClick={() => handleLogMeal(recipe)} disabled={isLogging[recipe.name]}
                            className="badge" style={{ background: loggedStatus[recipe.name] ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.8)', color: loggedStatus[recipe.name] ? '#0369a1' : 'var(--text-sub)', border:'1px solid rgba(14,165,233,0.2)', cursor:'pointer', padding:'6px 14px', fontSize:13 }}>
                            {loggedStatus[recipe.name] ? <><CheckCircle2 className="h-3.5 w-3.5" /> Logged</> : isLogging[recipe.name] ? <><Loader2 className="h-3.5 w-3.5 spin" /> Logging</> : 'Log to Today'}
                          </button>
                          <button onClick={handleGenerate} disabled={isLoading}
                            className="badge" style={{ background:'rgba(249,115,22,0.10)', color:'#9a3412', border:'1px solid rgba(249,115,22,0.2)', cursor:'pointer', padding:'6px 14px', fontSize:13 }}>
                            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                          </button>
                          {/* ── AI Meal Swap ── */}
                          <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowSwapMenu(s => !s)} disabled={isLoading || isSwapping}
                              className="badge" style={{ background:'rgba(139,92,246,0.12)', color:'#6d28d9', border:'1px solid rgba(139,92,246,0.25)', cursor:'pointer', padding:'6px 14px', fontSize:13 }}>
                              {isSwapping ? <><Loader2 className="h-3.5 w-3.5 spin" /> Swapping…</> : <><ArrowLeftRight className="h-3.5 w-3.5" /> AI Swap</>}
                            </button>
                            {showSwapMenu && (
                              <div style={{ position:'absolute', top:'110%', right:0, zIndex:99, background:'#fff', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', padding:14, minWidth:190, border:'1px solid rgba(45,85,54,0.12)' }}>
                                <div className="section-label mb-2">Swap Style</div>
                                {['vegetarian','lower carb','high protein','budget','gluten free'].map(r => (
                                  <button key={r} onClick={() => { setSwapReason(r); handleAiSwap(recipe); }}
                                    style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight: swapReason===r ? 700 : 400, background: swapReason===r ? 'rgba(139,92,246,0.10)' : 'transparent', color:'var(--text-main)', marginBottom:2 }}>
                                    {r === 'vegetarian' ? '🥦' : r === 'lower carb' ? '🥩' : r === 'high protein' ? '💪' : r === 'budget' ? '💰' : '🌾'} {r.charAt(0).toUpperCase() + r.slice(1)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop:'1px solid rgba(45,85,54,0.10)', padding:'16px 20px' }}>
                      <div className="grid gap-6" style={{ gridTemplateColumns:'1fr 1fr' }}>
                        <div>
                          <div className="section-label mb-3">Ingredients</div>
                          <ul style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {(recipe.ingredients ?? []).map((ing: any, i: number) => (
                              <li key={i} className="flex items-center justify-between text-sm"
                                style={{ padding:'8px 12px', background:'rgba(45,85,54,0.06)', borderRadius:12, color:'var(--text-sub)' }}>
                                <span>{ing.name}</span>
                                <span className="font-semibold" style={{ color:'var(--text-main)' }}>{ing.amount}{ing.unit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="section-label mb-3">Instructions</div>
                          <ol style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {recipeInstructions.map((step: string, i: number) => (
                              <li key={i} className="flex gap-3 text-sm" style={{ color:'var(--text-sub)' }}>
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                  style={{ background:'linear-gradient(135deg,#2d5536,#4a8856)', color:'#fff' }}>{i+1}</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      {/* ── Macro Distribution Pie ── */}
                      <MacroPie
                        protein={macroFit.protein_achieved}
                        carbs={macroFit.carbs_achieved}
                        fat={macroFit.fat_achieved}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grocery Receipt card moved to left sidebar */}

            {/* Loading state */}
            {isLoading && (
              <div className="glass-card p-6 fade-up">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background:'linear-gradient(135deg,#2d5536,#4a8856)' }}>
                    <Loader2 className="h-6 w-6 text-white spin" />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color:'var(--text-main)' }}>AI is cooking your plan…</p>
                    <p className="text-sm" style={{ color:'var(--sage)' }}>Optimising macros & ingredients</p>
                  </div>
                </div>
                <div className="shimmer mt-4 h-3 rounded-full" />
                <div className="shimmer mt-2 h-3 rounded-full" style={{ width:'70%' }} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Saved Meals Modal ── */}
      {isSavedMealsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background:'rgba(26,46,31,0.60)', backdropFilter:'blur(12px)' }}>
          <div className="glass-card fade-up w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color:'var(--text-main)' }}>Saved Meals</h2>
                <p className="text-sm" style={{ color:'var(--sage)' }}>Recipes you've saved for later</p>
              </div>
              <button onClick={() => setIsSavedMealsOpen(false)}
                style={{ background:'rgba(239,68,68,0.10)', border:'none', borderRadius:999, padding:'8px', cursor:'pointer', color:'#991b1b' }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {savedMeals.length === 0 ? (
              <div className="text-center py-12" style={{ color:'var(--sage)' }}>
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>No saved meals yet. Generate a recipe and save it!</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {savedMeals.map((meal: any, idx: number) => (
                  <div key={idx} className="meal-card">
                    <div className="flex gap-4 p-4 items-center">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl"
                        style={{ background:'linear-gradient(135deg,rgba(45,85,54,0.12),rgba(90,168,110,0.18))' }}>
                        {MEAL_FOOD_EMOJIS[meal.meal_type?.toLowerCase()] || '🍴'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="badge badge-green" style={{ fontSize:10 }}>{meal.meal_type || 'Custom'}</span>
                        <p className="text-base font-bold mt-1" style={{ color:'var(--text-main)' }}>{meal.title || meal.name}</p>
                        <p className="text-xs mt-0.5" style={{ color:'var(--sage)' }}>
                          {meal.macro_fit?.calories_achieved || 0} kcal • {meal.macro_fit?.protein_achieved || 0}g protein
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleLogMeal(meal)} disabled={isLogging[meal.name]}
                          className="badge" style={{ background: loggedStatus[meal.name] ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.8)', color: loggedStatus[meal.name] ? '#0369a1' : 'var(--text-sub)', border:'1px solid rgba(14,165,233,0.2)', cursor:'pointer', padding:'6px 12px', justifyContent:'center' }}>
                          {loggedStatus[meal.name] ? <><CheckCircle2 className="h-3 w-3" /> Logged</> : isLogging[meal.name] ? <><Loader2 className="h-3 w-3 spin" /> Logging</> : 'Log Today'}
                        </button>
                        <button onClick={handleGenerate} disabled={isLoading}
                          className="badge" style={{ background:'rgba(249,115,22,0.10)', color:'#9a3412', border:'1px solid rgba(249,115,22,0.2)', cursor:'pointer', padding:'6px 12px', justifyContent:'center' }}>
                          <RefreshCw className="h-3 w-3" /> Regen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
