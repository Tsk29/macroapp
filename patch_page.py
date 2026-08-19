import re

with open('frontend/app/page.tsx', 'r') as f:
    content = f.read()

# Add state variables
state_vars = """  const [activeTab, setActiveTab]             = useState<'build' | 'diary' | 'stats'>('build');
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [customFoodQuery, setCustomFoodQuery] = useState('');
  const [customFood, setCustomFood]           = useState({ name: '', meal_type: 'Snack', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [isEstimating, setIsEstimating]       = useState(false);"""
content = content.replace("  const [activeTab, setActiveTab]             = useState<'build' | 'diary' | 'stats'>('build');", state_vars)

# Add estimateCustomFood
content = content.replace("fetchDailySummary, fetchWeeklySummary, aiSwap,", "fetchDailySummary, fetchWeeklySummary, aiSwap, estimateCustomFood,")

# Add handlers
handlers = """  const getTodayString = () => new Date().toISOString().split('T')[0];

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
  }"""
content = content.replace("  const getTodayString = () => new Date().toISOString().split('T')[0];", handlers)

# Add Log Food button
log_button = """<div className="section-label">Daily Diary</div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-green">{dailySummary?.meals?.length || 0} logged</span>
                  <button onClick={() => setShowCustomFoodModal(true)}
                    className="pill-btn pill-btn-green" style={{ padding: '6px 14px', fontSize: 12 }}>
                    <Plus className="h-3.5 w-3.5" /> Log Food
                  </button>
                </div>"""
content = content.replace("""<div className="section-label">Daily Diary</div>
                <span className="badge badge-green">{dailySummary?.meals?.length || 0} logged</span>""", log_button)

# Add modal
modal = """      {/* ── Custom Food Modal ── */}
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
              <div className="flex gap-2">
                <input className="field flex-1" placeholder="e.g. 3 rice cakes with 15g honey" value={customFoodQuery}
                  onChange={e => setCustomFoodQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEstimateFood()} />
                <button onClick={handleEstimateFood} disabled={isEstimating || !customFoodQuery.trim()}
                  className="pill-btn pill-btn-green" style={{ padding: '9px 16px', flexShrink: 0 }}>
                  {isEstimating ? <Loader2 className="h-4 w-4 spin" /> : <Sparkles className="h-4 w-4" />}
                  {isEstimating ? '' : 'Estimate'}
                </button>
              </div>
              {isEstimating && <p className="text-xs mt-1" style={{ color: 'var(--sage)' }}>AI is estimating nutrition…</p>}
            </div>

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
                      {['Breakfast','Lunch','Dinner','Snack'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
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

            <button onClick={handleLogCustomFood} disabled={!customFood.name || customFood.calories <= 0}
              className="pill-btn pill-btn-green w-full" style={{ padding: '12px' }}>
              <CheckCircle2 className="h-4 w-4" /> Log to Diary
            </button>
          </div>
        </div>
      )}
    </div>
  );"""
content = content.replace("""    </div>
  );""", modal)

# Replace the icon to Leaf
content = content.replace("import { ", "import { Leaf, ")
content = re.sub(r'<span className="text-3xl">🥗</span>', r'<Leaf className="h-8 w-8 text-white" strokeWidth={2.5} />', content)
content = re.sub(r'<span className="text-lg">🥗</span>', r'<Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />', content)

# Change the name to "Genau Meal" everywhere instead of "NutriPlan" or whatever is in the header
content = content.replace(">NutriPlan</div>", ">Genau Meal</div>")
content = content.replace(">Nutrition Dashboard</div>", ">Genau Meal</div>")

with open('frontend/app/page.tsx', 'w') as f:
    f.write(content)
