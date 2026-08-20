'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, CheckCircle2, Loader2, Sparkles,
  UploadCloud, X, UtensilsCrossed, Flame, Dumbbell,
  Wheat, Droplets, LogOut, BookMarked, RefreshCw, Plus, Minus,
  ShoppingCart, ArrowLeftRight, Leaf, Camera, ChefHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
function toLocalDateString(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

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
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(160deg, #eef7f1 0%, #c5e1cf 100%)' }}>
      <div className="glass-card fade-up w-full max-w-md p-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #2d5536, #4a8856)' }}>
            <Leaf className="h-8 w-8 text-white" strokeWidth={2.5} />
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
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [newPantryItem, setNewPantryItem] = useState('');
  const [mode, setMode] = useState<'single_meal' | 'full_day'>('single_meal');
  const [mealType, setMealType] = useState('Lunch');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Mediterranean']);
  const [targetCalories, setTargetCalories] = useState(1900);
  const [targetProtein, setTargetProtein]   = useState(130);
  const [targetCarbs, setTargetCarbs]       = useState(180);
  const [targetFat, setTargetFat]           = useState(60);

  const {
    state, isLoading, error,
    generateRecipe, parsePantryVoice, saveMeal, fetchSavedMeals,
    login, register, updateProfile, logDailyMeal, fetchDailySummary, fetchWeeklySummary, aiSwap,
    estimateCustomFood,
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
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [customFoodQuery, setCustomFoodQuery] = useState('');
  const [customFood, setCustomFood]           = useState({ name: '', meal_type: 'Snack', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isEstimating, setIsEstimating]       = useState(false);
  const [isListeningPantry, setIsListeningPantry] = useState(false);
  const [isListeningCustom, setIsListeningCustom] = useState(false);
  const [isDarkMode, setIsDarkMode]           = useState(false);
  const [showOnboarding, setShowOnboarding]   = useState(false);
  const [onboardingData, setOnboardingData]   = useState({ weight: 70, goal: 'maintain', activity: 'light' });

  const [isScanning, setIsScanning]           = useState(false);
  const [amountEaten, setAmountEaten]         = useState<number | ''>(100);
  const [baseMacros, setBaseMacros]           = useState<{c:number, p:number, cb:number, f:number} | null>(null);

  async function handleBarcodeScanned(decodedText: string) {
    setIsScanning(false);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name = p.product_name || 'Unknown Food';
        const n = p.nutriments || {};
        const c = n['energy-kcal_100g'] || 0;
        const pr = n['proteins_100g'] || 0;
        const cb = n['carbohydrates_100g'] || 0;
        const f = n['fat_100g'] || 0;
        
        setBaseMacros({c, p:pr, cb, f});
        setAmountEaten(100);
        setCustomFood(prev => ({
          ...prev,
          name: name,
          calories: Math.round(c),
          protein: Math.round(pr),
          carbs: Math.round(cb),
          fat: Math.round(f)
        }));
      } else {
        alert('Product not found in Open Food Facts database.');
      }
    } catch (e) {
      alert('Error fetching barcode data.');
    }
  }

  useEffect(() => {
    if (baseMacros && amountEaten !== '') {
      const scale = (amountEaten as number) / 100;
      setCustomFood(prev => ({
        ...prev,
        calories: Math.round(baseMacros.c * scale),
        protein: Math.round(baseMacros.p * scale),
        carbs: Math.round(baseMacros.cb * scale),
        fat: Math.round(baseMacros.f * scale),
      }));
    }
  }, [amountEaten, baseMacros]);

  useEffect(() => {
    let scanner: any;
    if (isScanning) {
      const { Html5QrcodeScanner } = require('html5-qrcode');
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
      scanner.render((text: string) => {
        scanner.clear();
        setIsScanning(false);
        handleBarcodeScanned(text);
      }, (err: any) => {});
    }
    return () => {
      if (scanner) {
        try { scanner.clear(); } catch(e) {}
      }
    };
  }, [isScanning]);

  function calculateMacros() {
    let tdee = onboardingData.weight * 22;
    if (onboardingData.activity === 'sedentary') tdee *= 1.2;
    if (onboardingData.activity === 'light') tdee *= 1.375;
    if (onboardingData.activity === 'active') tdee *= 1.55;

    let target = tdee;
    if (onboardingData.goal === 'cut') target -= 500;
    if (onboardingData.goal === 'bulk') target += 500;
    target = Math.round(target / 10) * 10;
    
    const protein = Math.round(onboardingData.weight * 2);
    const fat = Math.round(onboardingData.weight * 0.8);
    const carbs = Math.max(0, Math.round((target - (protein * 4) - (fat * 9)) / 4));

    setTargetCalories(target);
    setTargetProtein(protein);
    setTargetFat(fat);
    setTargetCarbs(carbs);
    setShowOnboarding(false);
  }

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

  const getTodayString = () => toLocalDateString(new Date());

  async function handleEstimateFood() {
    if (!customFoodQuery.trim()) return;
    setIsEstimating(true);
    try {
      const res = await estimateCustomFood(customFoodQuery);
      if (res) {
        setCustomFood({
          name: res.name || customFoodQuery,
          meal_type: res.meal_type || 'Snack',
          calories: res.calories || 0,
          protein: res.protein || 0,
          carbs: res.carbs || 0,
          fat: res.fat || 0,
        });
      }
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleLogCustomFood() {
    if (!customFood.name || customFood.calories <= 0) return;
    const mockRecipe = {
      name: customFood.name,
      title: customFood.name,
      meal_type: customFood.meal_type,
      cuisine: 'Custom',
      instructions: [],
      ingredients: [],
      missing_ingredients: [],
      macro_fit: {
        calories_achieved: customFood.calories,
        protein_achieved: customFood.protein,
        carbs_achieved: customFood.carbs,
        fat_achieved: customFood.fat,
      },
    };
    await logDailyMeal(userProfile.username, getTodayString(), mockRecipe, 0, []);
    await fetchDailySummary(userProfile.username, getTodayString()).then(d => d && setDailySummary(d));
    setShowCustomFoodModal(false);
    setCustomFoodQuery('');
    setCustomFood({ name: '', meal_type: 'Snack', calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

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
      const weekStart = toLocalDateString(monday);
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
    const dateStr = toLocalDateString(d);
    fetchDailySummary(userProfile.username, dateStr).then(setDailySummary);
  }, [activeDay]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleVoicePantry = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported in your browser.');
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListeningPantry(true);
    rec.onend = () => setIsListeningPantry(false);
    rec.onresult = async (e: any) => {
      const text = e.results[0][0].transcript;
      const parsed = await parsePantryVoice(text);
      if (!parsed || !Array.isArray(parsed)) return;
      setIngredients(cur => [...cur, ...parsed.map((i: any) => ({
        id: i.id || createIngredient().id, name: i.name || '', amount: i.amount ?? 0, unit: i.unit || 'g',
      }))]);
    };
    rec.start();
  };

  const handleGenerateZeroWaste = async () => {
    if (pantryItems.length === 0) return;
    const payload = {
      user_prompt: '',
      mode: mode,
      meal_type: mealType,
      cuisine_preference: selectedCuisines,
      target_calories: targetCalories,
      target_protein: targetProtein,
      target_carbs: targetCarbs,
      target_fat: targetFat,
      ingredients: pantryItems.map(item => ({ id: Math.random().toString(), name: item, amount: 100, unit: 'g' })),
      pantry_items: pantryItems
    };
    await generateRecipe(payload);
  };

  const handlePantryVoiceParse = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported in your browser.');
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListeningPantry(true);
    rec.onend = () => setIsListeningPantry(false);
    rec.onresult = async (e: any) => {
      const text = e.results[0][0].transcript;
      const parsed = await parsePantryVoice(text);
      if (!parsed || !Array.isArray(parsed)) return;
      setPantryItems(cur => [...cur, ...parsed.map((i: any) => i.name)]);
    };
    rec.start();
  };

  const handleVoiceCustom = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported in your browser.');
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListeningCustom(true);
    rec.onend = () => setIsListeningCustom(false);
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setCustomFoodQuery(text);
    };
    rec.start();
  };

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
      const dateStr = d ? toLocalDateString(d) : getTodayString();
      const newSummary = await fetchDailySummary(userProfile.username, dateStr);
      setDailySummary(newSummary);
    }
    setIsLogging(prev => ({ ...prev, [recipeToLog.name]: false }));
  }

  async function handleGenerate() {
    const validIngredients = ingredients.filter(i => i.name.trim() !== '');
    setIngredients(validIngredients.length > 0 ? validIngredients : [createIngredient()]);
    
    const ac = targetCalories;
    const ap = targetProtein;
    const ach = targetCarbs;
    const af = targetFat;
    
    const finalIngredients = validIngredients.length > 0 ? validIngredients : [];
    await generateRecipe({
      user_prompt: finalIngredients.map(i => i.name).filter(Boolean).join(', '),
      mode, meal_type: mealType, cuisine_preference: selectedCuisines,
      target_calories: ac, target_protein: ap, target_carbs: ach, target_fat: af, ingredients: finalIngredients,
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
      target_calories: targetCalories,
      target_protein:  targetProtein,
      target_carbs:    targetCarbs,
      target_fat:      targetFat,
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
    if (first) window.open(`https://shop.rewe.de/search?searchFor=${encodeURIComponent(first)}`, '_blank');
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
    if (first) window.open(`https://shop.rewe.de/search?searchFor=${encodeURIComponent(first)}`, '_blank');
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
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-gradient)', transition: 'background 0.3s ease' }}>
        
        {/* ── Sidebar (Desktop) ── */}
        <aside className="w-64 flex-shrink-0 relative hidden md:flex flex-col border-r" style={{ background: 'rgba(255, 255, 255, 0.4)', borderColor: 'rgba(45,85,54,0.1)' }}>
          <div className="p-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #2d5536, #4a8856)' }}>
              <Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Genau Meal</div>
              <div className="text-xs" style={{ color: 'var(--sage)' }}>Hi, {userProfile.username} 👋</div>
            </div>
          </div>
          
          <nav className="px-4 py-2 space-y-2 mt-2">
            {([['build','🍳','Build Recipe'], ['diary','📓','My Diary'], ['stats','📊','Progress']] as const).map(([tab, emoji, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="w-full text-left px-4 py-3 text-sm font-semibold transition-all"
                style={{ background: activeTab === tab ? 'linear-gradient(135deg,#2d5536,#4a8856)' : 'transparent', color: activeTab === tab ? '#fff' : 'var(--text-sub)', borderRadius: '12px' }}>
                <span className="mr-3">{emoji}</span> {label}
              </button>
            ))}
            
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'rgba(45,85,54,0.1)' }}>
              <div className="px-4 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sage)' }}>Macro Targets</div>
              <div className="grid grid-cols-2 gap-2 px-2">
                {[
                  { label:'Kcal', val:targetCalories, set:setTargetCalories },
                  { label:'Pro',  val:targetProtein, set:setTargetProtein },
                  { label:'Carb', val:targetCarbs,   set:setTargetCarbs },
                  { label:'Fat',  val:targetFat,     set:setTargetFat },
                ].map(m => (
                  <div key={m.label} className="flex flex-col">
                    <span className="text-[10px] font-medium ml-1" style={{ color:'var(--text-sub)' }}>{m.label}</span>
                    <input type="number" className="field" value={m.val} onChange={e => m.set(Number(e.target.value))} style={{ padding: '4px 8px', fontSize: '12px' }} />
                  </div>
                ))}
              </div>
              <button onClick={handleUpdateProfile} disabled={isLoading} className="w-full mt-3 text-xs font-semibold py-2 rounded-xl transition-all" style={{ background: 'rgba(45,85,54,0.1)', color: 'var(--green-600)' }}>
                {isLoading ? 'Saving...' : 'Save Targets'}
              </button>
            </div>
          </nav>

          <div className="p-4 space-y-2 mt-auto mb-4 border-t" style={{ borderColor: 'rgba(45,85,54,0.1)' }}>
            <button onClick={() => setIsDarkMode(d => !d)} className="w-full text-left px-4 py-2 text-sm font-semibold rounded-xl hover:bg-gray-100/50" style={{ color: 'var(--text-sub)' }}>
              <span className="mr-3">{isDarkMode ? '🌙' : '☀️'}</span> {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </button>
            <button onClick={async () => { setIsSavedMealsOpen(true); const m = await fetchSavedMeals(); setSavedMeals(m); }} className="w-full text-left px-4 py-2 text-sm font-semibold rounded-xl hover:bg-gray-100/50" style={{ color: 'var(--text-sub)' }}>
              <span className="mr-3"><BookMarked className="inline h-4 w-4" /></span> Saved Meals
            </button>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-semibold rounded-xl mt-2 hover:bg-red-50/50" style={{ color: '#991b1b', background: 'rgba(239,68,68,0.1)' }}>
              <span className="mr-3"><LogOut className="inline h-4 w-4" /></span> Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main Scrollable Area ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Mobile Header */}
          <header className="md:hidden glass-card mx-auto mt-4 flex items-center justify-between px-6 py-3" style={{ borderRadius: '20px', margin: '16px 16px', maxWidth: '100%' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #2d5536, #4a8856)' }}>
                <Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Genau Meal</div>
            </div>
            <button onClick={() => setIsDarkMode(d => !d)} className="pill-btn pill-btn-outline text-sm" style={{ padding: '8px 12px' }}>{isDarkMode ? '🌙' : '☀️'}</button>
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
      <main style={{ maxWidth: '1000px', margin: '16px auto 32px', padding: '0 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ══ LEFT PANEL (Diary & Dashboard) ══ */}
          {activeTab === 'diary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Macro overview rings */}
            <div className="glass-card p-4">
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
            <div className="glass-card p-4" style={{ flex: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="badge badge-green">{dailySummary?.meals?.length || 0} logged</span>
                  <button onClick={() => setShowCustomFoodModal(true)}
                    className="pill-btn pill-btn-green" style={{ padding: '6px 14px', fontSize: 12 }}>
                    <Plus className="h-3.5 w-3.5" /> Log Food
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(['Breakfast','Lunch','Dinner','Snacks','Other'] as const).map(cat => {
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

                  {/* REWE buttons removed */}
                </div>
              )}
            </div>

            {/* ── Rewe Shopping List (live, from current generated recipe) ── */}
            {(receipt.missing.length > 0 || (recipe?.missing_ingredients?.length ?? 0) > 0) && (
              <div className="glass-card p-4 fade-up">
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
                      {/* REWE buttons removed */}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
          )}

          {/* ══ RIGHT PANEL ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Weekly Compliance Bar Chart */}
            {activeTab === 'stats' && weeklyData.length > 0 && (
              <div className="glass-card p-4 fade-up">
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

            {/* Pantry Intelligence */}
            {activeTab === 'build' && (
              <>
            <div className="glass-card p-5 mb-4 fade-up">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="section-label mb-1">Zero Waste Mode</div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>My Pantry</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {pantryItems.map((item, idx) => (
                  <span key={idx} className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#b45309', padding: '6px 12px', fontSize: 13 }}>
                    {item}
                    <button onClick={() => setPantryItems(prev => prev.filter((_, i) => i !== idx))} style={{ marginLeft: 6, color: '#b45309', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="w-full form-input" 
                  placeholder="Add item (e.g., half a cabbage, 2 eggs)" 
                  value={newPantryItem}
                  onChange={(e) => setNewPantryItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPantryItem.trim()) {
                      setPantryItems(prev => [...prev, newPantryItem.trim()]);
                      setNewPantryItem('');
                    }
                  }}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(45,85,54,0.15)', background: 'rgba(255,255,255,0.7)', outline: 'none' }}
                />
                <button 
                  className="pill-btn" 
                  style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 12 }}
                  onClick={() => {
                    if (newPantryItem.trim()) {
                      setPantryItems(prev => [...prev, newPantryItem.trim()]);
                      setNewPantryItem('');
                    }
                  }}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {pantryItems.length > 0 && (
                <button 
                  className="pill-btn w-full mt-4 flex items-center justify-center gap-2" 
                  disabled={isLoading}
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', border: 'none', padding: '12px', borderRadius: 14, fontWeight: 700 }}
                  onClick={handleGenerateZeroWaste}>
                  {isLoading ? <Loader2 className="h-4 w-4 spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Zero Waste Meal
                </button>
              )}
            </div>

            {/* Build tab */}
            <div className="glass-card p-5">
              {/* Tabs (mobile) */}
              <div className="hidden gap-2 mb-6">
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
                <div className="mb-6">
                  <div className="section-label mb-2">Meal Type</div>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {['Breakfast','Lunch','Dinner','Snack','Custom'].map(t => (
                      <button key={t} onClick={() => setMealType(t)}
                        className="pill-btn text-sm transition-all"
                        style={{ padding:'8px 16px', background: mealType===t ? 'linear-gradient(135deg,#2d5536,#4a8856)' : 'rgba(255,255,255,0.6)', color: mealType===t ? '#fff' : 'var(--text-sub)', border: mealType===t ? 'none' : '1.5px solid rgba(45,85,54,0.18)', borderRadius:12 }}>
                        {MEAL_EMOJIS[t.toLowerCase()]} {t}
                      </button>
                    ))}
                  </div>
                  
                  {/* Log Custom Food Card */}
                  <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'linear-gradient(to right, rgba(45,85,54,0.05), rgba(45,85,54,0.02))', border: '1px solid rgba(45,85,54,0.1)' }}>
                    <div>
                      <div className="text-sm font-bold" style={{ color: 'var(--green-800)' }}>Did you eat something else?</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>Log standalone foods or snacks via voice or barcode.</div>
                    </div>
                    <button onClick={() => setShowCustomFoodModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all" style={{ background: 'var(--green-600)', color: '#fff', boxShadow: '0 4px 12px rgba(45,85,54,0.2)' }}>
                      <span style={{ fontSize: '14px' }}>➕</span> Quick Log
                    </button>
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

              {/* Voice Pantry logging */}
              <div className="mb-4">
                <div className="section-label mb-2">Voice Log Pantry</div>
                <div className="flex gap-3 items-end">
                  <button className="flex-1 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-4 cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={handleVoicePantry} disabled={isListeningPantry || isLoading}
                    style={{ borderColor: isListeningPantry ? 'var(--green-600)' : 'rgba(45,85,54,0.25)', background: isListeningPantry ? 'rgba(45,85,54,0.1)' : 'rgba(255,255,255,0.5)' }}>
                    {isListeningPantry ? (
                      <span className="flex items-center gap-2" style={{ color: 'var(--green-600)', fontWeight: 600 }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> Listening...
                      </span>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--green-600)' }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                        <span className="text-xs font-semibold" style={{ color:'var(--text)' }}>Tap to speak your ingredients</span>
                        <span className="text-xs" style={{ color:'var(--sage)' }}>"I have 100g chicken and some rice"</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Macro targets */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="section-label">Daily Macro Targets</div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowOnboarding(true)} className="text-xs font-semibold" style={{ color:'var(--green-600)', background:'none', border:'none', cursor:'pointer' }}>
                      Calculate Macros
                    </button>
                    <button onClick={handleUpdateProfile} disabled={isLoading}
                      className="text-xs font-semibold" style={{ color:'var(--green-600)', background:'none', border:'none', cursor:'pointer' }}>
                      {isLoading ? 'Saving…' : 'Save Profile'}
                    </button>
                  </div>
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
            <AnimatePresence mode="wait">
            {meals.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card p-5">
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
                        <div className="flex gap-3 p-4">
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
                          <div className="grid gap-3" style={{ gridTemplateColumns:'1fr 1fr' }}>
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
                    <div className="flex gap-3 p-4">
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
                      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 1fr' }}>
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
              </motion.div>
            )}
            </AnimatePresence>

            {/* Grocery Receipt card moved to left sidebar */}

            {/* Loading state */}
            {isLoading && (
              <div className="glass-card p-5 fade-up">
                <div className="flex items-center gap-3">
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
              </>
            )}
          </div>
        </div>
      </main>
      </div>
      </div>

      {/* ── Saved Meals Modal ── */}
      {isSavedMealsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
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
                    <div className="flex gap-3 p-4 items-center">
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
      {/* ── Custom Food Modal ── */}
      {showCustomFoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,46,31,0.55)', backdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCustomFoodModal(false); }}>
          <div className="glass-card fade-up w-full max-w-md p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label mb-0.5">Quick Add</div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Log Custom Food</h2>
              </div>
              <button onClick={() => setShowCustomFoodModal(false)}
                style={{ background: 'rgba(239,68,68,0.10)', border: 'none', borderRadius: 999, padding: '8px', cursor: 'pointer', color: '#991b1b' }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="section-label mb-2">Describe what you ate</div>
              <div className="flex gap-2 items-center">
                <input className="field flex-1" placeholder="e.g. 3 rice cakes with 15g honey" value={customFoodQuery}
                  onChange={e => setCustomFoodQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEstimateFood()} />
                <button className="pill-btn pill-btn-outline" onClick={handleVoiceCustom} disabled={isListeningCustom} style={{ padding: '9px', flexShrink: 0, height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isListeningCustom ? <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-sub)' }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>}
                </button>
                <button className="pill-btn pill-btn-outline" onClick={() => setIsScanning(s => !s)} style={{ padding: '9px', flexShrink: 0, height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera className="h-4 w-4" style={{ color: 'var(--text-sub)' }} />
                </button>
                <button onClick={handleEstimateFood} disabled={isEstimating || !customFoodQuery.trim()}
                  className="pill-btn pill-btn-green" style={{ padding: '9px 16px', flexShrink: 0, height: '42px' }}>
                  {isEstimating ? <Loader2 className="h-4 w-4 spin" /> : <Sparkles className="h-4 w-4" />}
                  {isEstimating ? '' : 'Estimate'}
                </button>
              </div>
              {isEstimating && <p className="text-xs mt-1" style={{ color: 'var(--sage)' }}>AI is estimating nutrition…</p>}
            </div>

            {isScanning && (
              <div className="mb-4">
                <div id="reader" style={{ width: '100%', borderRadius: 16, overflow: 'hidden' }}></div>
              </div>
            )}

            <div className="mb-4">
              <div className="section-label mb-2">Food Details</div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>Food Name</label>
                    <input className="field" placeholder="e.g. Rice cakes with honey" value={customFood.name}
                      onChange={e => setCustomFood(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div style={{ width: 110 }}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>Meal Type</label>
                    <select className="field" value={customFood.meal_type}
                      onChange={e => setCustomFood(prev => ({ ...prev, meal_type: e.target.value }))}>
                      {['Breakfast','Lunch','Dinner','Snack','Custom'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {baseMacros && (
                    <div style={{ width: 90 }}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>Amount (g)</label>
                      <input type="number" className="field" value={amountEaten}
                        onChange={e => setAmountEaten(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', key: 'calories', unit: 'kcal' },
                    { label: 'Protein',  key: 'protein',  unit: 'g' },
                    { label: 'Carbs',    key: 'carbs',    unit: 'g' },
                    { label: 'Fat',      key: 'fat',      unit: 'g' },
                  ].map(({ label, key, unit }) => (
                    <div key={key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>{label} <span style={{ color:'var(--sage)' }}>({unit})</span></label>
                      <input type="number" className="field" style={{ textAlign: 'center' }}
                        value={(customFood as any)[key] || ''}
                        onChange={e => setCustomFood(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleLogCustomFood} disabled={!customFood.name}
              className="pill-btn pill-btn-green w-full" style={{ padding: '12px' }}>
              <CheckCircle2 className="h-4 w-4" /> Log to Diary
            </button>
          </div>
        </div>
      )}

      {/* ── Onboarding Macro Calculator Modal ── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,46,31,0.55)', backdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowOnboarding(false); }}>
          <div className="glass-card fade-up w-full max-w-md p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label mb-0.5">Setup</div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Calculate Macros</h2>
              </div>
              <button onClick={() => setShowOnboarding(false)}
                style={{ background: 'rgba(239,68,68,0.10)', border: 'none', borderRadius: 999, padding: '8px', cursor: 'pointer', color: '#991b1b' }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>Weight (kg)</label>
                <input type="number" className="field" value={onboardingData.weight}
                  onChange={e => setOnboardingData({ ...onboardingData, weight: Number(e.target.value) })} />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>Activity Level</label>
                <select className="field" value={onboardingData.activity}
                  onChange={e => setOnboardingData({ ...onboardingData, activity: e.target.value })}>
                  <option value="sedentary">Sedentary (Little to no exercise)</option>
                  <option value="light">Lightly Active (Exercise 1-3 days/wk)</option>
                  <option value="active">Active (Exercise 3-5 days/wk)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-sub)' }}>Goal</label>
                <select className="field" value={onboardingData.goal}
                  onChange={e => setOnboardingData({ ...onboardingData, goal: e.target.value })}>
                  <option value="cut">Lose Weight (Cut)</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="bulk">Gain Muscle (Bulk)</option>
                </select>
              </div>
            </div>

            <button onClick={calculateMacros} className="pill-btn pill-btn-green w-full">
              Calculate & Set Targets
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
