from __future__ import annotations

import uuid
from pathlib import Path
from typing import List, Optional, Literal

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

import json
import hashlib
from main import run_workflow
from schemas import AppState, IngredientInput, Recipe, UserProfile, LoginRequest, LogMealRequest, RegisterRequest, EstimateCustomFoodRequest, EstimateCustomFoodResponse


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Genau Meal Web UI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


class SubmitPayload(BaseModel):
    user_prompt: str | None = None
    mode: Literal["single_meal", "full_day"] = "single_meal"
    meal_type: str | None = "Lunch"
    cuisine_preference: list[str] = Field(default_factory=list)
    target_calories: int = 0
    target_protein: int = 0
    target_carbs: int = 0
    target_fat: int = 0
    ingredients: list[IngredientInput] = Field(default_factory=list)
    pantry_items: list[str] = Field(default_factory=list)


@app.get("/", response_class=HTMLResponse)
async def homepage(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "result": None,
            "mode": "single_meal",
            "meal_type": "Lunch",
            "user_prompt": "",
            "selected_recipe": None,
            "cuisine_preferences": [],
        },
    )


@app.post("/api/submit", response_model=AppState)
async def submit_api(payload: SubmitPayload) -> AppState:
    state = AppState(
        user_prompt=payload.user_prompt,
        mode=payload.mode,
        meal_type=payload.meal_type,
        cuisine_preference=payload.cuisine_preference,
        target_calories=payload.target_calories,
        target_protein=payload.target_protein,
        target_carbs=payload.target_carbs,
        target_fat=payload.target_fat,
        ingredients=payload.ingredients,
        pantry_items=payload.pantry_items,
    )
    final_state = await run_workflow(state)
    return final_state


@app.post("/generate", response_model=AppState)
async def generate_api(payload: SubmitPayload) -> AppState:
    state = AppState(
        user_prompt=payload.user_prompt,
        mode=payload.mode,
        meal_type=payload.meal_type,
        cuisine_preference=payload.cuisine_preference,
        target_calories=payload.target_calories,
        target_protein=payload.target_protein,
        target_carbs=payload.target_carbs,
        target_fat=payload.target_fat,
        ingredients=payload.ingredients,
        pantry_items=payload.pantry_items,
    )
    final_state = await run_workflow(state)
    return final_state

class ParsePantryVoiceRequest(BaseModel):
    text: str

@app.post("/parse_pantry_voice")
async def parse_pantry_voice(req: ParsePantryVoiceRequest):
    from nodes import parse_voice_node
    ingredients = await parse_voice_node(req.text)
    return [ing.model_dump() for ing in ingredients]

@app.post("/submit", response_class=HTMLResponse)
async def submit(
    request: Request,
    user_prompt: str = Form(""),
    mode: str = Form("single_meal"),
    meal_type: str = Form("Lunch"),
    cuisine_preferences: List[str] = Form([]),
    selected_recipe: str = Form(""),
    upload: UploadFile | None = File(None),
) -> HTMLResponse:
    state = AppState(
        user_prompt=user_prompt,
        mode=mode,
        meal_type=meal_type,
        cuisine_preference=cuisine_preferences,
    )

    if upload is not None and upload.filename:
        file_extension = Path(upload.filename).suffix.lower()
        if file_extension not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise HTTPException(status_code=400, detail="Unsupported image format.")
        image_name = f"{uuid.uuid4()}{file_extension}"
        image_path = UPLOAD_DIR / image_name
        with image_path.open("wb") as buffer:
            buffer.write(await upload.read())
        state.uploaded_image_name = image_name

    final_state = await run_workflow(state)

    if selected_recipe.strip() and final_state.suggested_recipes:
        try:
            index = int(selected_recipe)
            if 0 <= index < len(final_state.suggested_recipes):
                choice = final_state.suggested_recipes[index]
                final_state.recipe = choice
                final_state.generated_recipe = choice
                final_state.display_recipe = choice
                final_state.meal_plan = final_state.meal_plan.copy(update={
                    "meals": [choice],
                    "total_calories": choice.calories,
                    "total_protein": choice.protein_grams,
                })
        except ValueError:
            pass

    if final_state.display_recipe is None and final_state.generated_recipe is not None:
        final_state.display_recipe = final_state.generated_recipe

    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "result": final_state,
            "mode": mode,
            "meal_type": meal_type,
            "user_prompt": user_prompt,
            "selected_recipe": selected_recipe,
            "cuisine_preferences": cuisine_preferences,
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


class SwapRequest(BaseModel):
    recipe: Recipe
    reason: str = "healthier"          # e.g. "lower carb", "vegetarian", "budget"
    cuisine_preference: list[str] = Field(default_factory=list)
    meal_type: str = "Lunch"
    target_calories: int = 0
    target_protein: int = 0
    target_carbs: int = 0
    target_fat: int = 0


@app.post("/ai_swap", response_model=AppState)
async def ai_swap(req: SwapRequest) -> AppState:
    """Generate an alternative recipe using the same ingredients with a different cuisine spin."""
    from nodes import generate_recipe_llm, estimate_macros
    from schemas import MacroFit

    cuisine = req.cuisine_preference[0] if req.cuisine_preference else "Mediterranean"
    swap_ingredients = req.recipe.ingredients or []
    meal_type_used = req.meal_type or req.recipe.meal_type or "Lunch"

    m_type_lower = meal_type_used.lower()
    scale = 0.35
    if "breakfast" in m_type_lower:
        scale = 0.25
    elif "lunch" in m_type_lower:
        scale = 0.35
    elif "dinner" in m_type_lower:
        scale = 0.30
    else:
        scale = 0.10

    scaled_calories = int(req.target_calories * scale)
    scaled_protein = int(req.target_protein * scale)
    scaled_carbs = int(req.target_carbs * scale)
    scaled_fat = int(req.target_fat * scale)

    reason_lower = req.reason.lower()
    if "high protein" in reason_lower:
        scaled_protein = int(scaled_protein * 1.5)
        scaled_carbs = int(scaled_carbs * 0.8)
    elif "lower carb" in reason_lower or "low carb" in reason_lower:
        scaled_carbs = int(scaled_carbs * 0.5)
        scaled_protein = int(scaled_protein * 1.2)
        scaled_fat = int(scaled_fat * 1.2)

    result = await generate_recipe_llm(
        ingredients=swap_ingredients,
        cuisine=cuisine,
        meal_type=meal_type_used,
        target_calories=scaled_calories,
        target_protein=scaled_protein,
        target_carbs=scaled_carbs,
        target_fat=scaled_fat,
        swap_reason=req.reason,
    )

    # Compute macros
    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for ing in swap_ingredients:
        m = estimate_macros(ing)
        for k in totals:
            totals[k] += m[k]

    macro_fit = MacroFit(
        calories_target=scaled_calories,
        calories_achieved=totals["calories"],
        calories_delta=totals["calories"] - scaled_calories,
        protein_target=scaled_protein,
        protein_achieved=totals["protein"],
        protein_delta=totals["protein"] - scaled_protein,
        carbs_target=scaled_carbs,
        carbs_achieved=totals["carbs"],
        carbs_delta=totals["carbs"] - scaled_carbs,
        fat_target=scaled_fat,
        fat_achieved=totals["fat"],
        fat_delta=totals["fat"] - scaled_fat,
        match_score_percentage=0,
    )

    new_recipe = Recipe(
        name=result.get("title", f"Swapped {cuisine} Meal"),
        title=result.get("title", f"Swapped {cuisine} Meal"),
        meal_type=meal_type_used,
        cuisine=cuisine,
        ingredients=swap_ingredients,
        instructions=result.get("instructions", []),
        macro_fit=macro_fit,
    )
    final = AppState(generated_recipe=new_recipe, display_recipe=new_recipe)
    return final



SAVED_MEALS_FILE = BASE_DIR / "saved_meals.json"

def get_saved_meals() -> list[dict]:
    if not SAVED_MEALS_FILE.exists():
        return []
    with SAVED_MEALS_FILE.open("r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

@app.post("/save_meal")
async def save_meal(recipe: Recipe) -> dict:
    meals = get_saved_meals()
    meals.append(recipe.model_dump())
    with SAVED_MEALS_FILE.open("w") as f:
        json.dump(meals, f, indent=2)
    return {"status": "success"}

@app.get("/saved_meals")
async def fetch_saved_meals() -> list[dict]:
    return get_saved_meals()

USERS_FILE = BASE_DIR / "users.json"
LOGS_FILE = BASE_DIR / "daily_logs.json"

def get_users() -> dict:
    if not USERS_FILE.exists(): return {}
    with USERS_FILE.open("r") as f:
        try: return json.load(f)
        except json.JSONDecodeError: return {}

def save_users(users: dict):
    with USERS_FILE.open("w") as f:
        json.dump(users, f, indent=2)

def get_logs() -> dict:
    if not LOGS_FILE.exists(): return {}
    with LOGS_FILE.open("r") as f:
        try: return json.load(f)
        except json.JSONDecodeError: return {}

def save_logs(logs: dict):
    with LOGS_FILE.open("w") as f:
        json.dump(logs, f, indent=2)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/estimate_custom_food")
async def estimate_custom_food(req: EstimateCustomFoodRequest) -> EstimateCustomFoodResponse:
    from nodes import estimate_custom_food_llm
    res = await estimate_custom_food_llm(req.query)
    return EstimateCustomFoodResponse(**res)

@app.post("/register")
async def register(req: RegisterRequest) -> UserProfile:
    users = get_users()
    if req.username in users:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = UserProfile(
        username=req.username,
        password_hash=hash_password(req.password)
    )
    users[req.username] = new_user.model_dump()
    save_users(users)
    return new_user

@app.post("/login")
async def login(req: LoginRequest) -> UserProfile:
    users = get_users()
    if req.username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = users[req.username]
    if user_data.get("password_hash") != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
        
    return UserProfile(**user_data)

@app.post("/update_profile")
async def update_profile(profile: UserProfile) -> dict:
    users = get_users()
    users[profile.username] = profile.model_dump()
    save_users(users)
    return {"status": "success"}

@app.post("/log_daily_meal")
async def log_daily_meal(req: LogMealRequest) -> dict:
    logs = get_logs()
    key = f"{req.username}_{req.date}"
    if key not in logs:
        logs[key] = []
    entry = req.recipe.model_dump()
    # Attach shopping snapshot to this specific meal log entry
    entry["shopping_cost"] = req.shopping_cost
    entry["shopping_items"] = req.shopping_items
    logs[key].append(entry)
    save_logs(logs)
    return {"status": "success"}

@app.get("/daily_summary")
async def daily_summary(username: str, date: str) -> dict:
    logs = get_logs()
    key = f"{username}_{date}"
    day_logs = logs.get(key, [])
    
    users = get_users()
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = UserProfile(**users[username])
    
    consumed = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    total_shopping_cost = 0.0
    all_shopping_items: list[dict] = []

    for meal in day_logs:
        if "macro_fit" in meal and meal["macro_fit"]:
            consumed["calories"] += meal["macro_fit"].get("calories_achieved", 0)
            consumed["protein"] += meal["macro_fit"].get("protein_achieved", 0)
            consumed["carbs"] += meal["macro_fit"].get("carbs_achieved", 0)
            consumed["fat"] += meal["macro_fit"].get("fat_achieved", 0)
        total_shopping_cost += meal.get("shopping_cost", 0.0)
        all_shopping_items.extend(meal.get("shopping_items", []))

    remaining = {
        "calories": max(0, profile.target_calories - consumed["calories"]),
        "protein": max(0, profile.target_protein - consumed["protein"]),
        "carbs": max(0, profile.target_carbs - consumed["carbs"]),
        "fat": max(0, profile.target_fat - consumed["fat"]),
    }
    
    return {
        "profile": profile.model_dump(),
        "consumed": consumed,
        "remaining": remaining,
        "meals": day_logs,
        "total_shopping_cost": round(total_shopping_cost, 2),
        "shopping_items": all_shopping_items,
    }


@app.get("/weekly_summary")
async def weekly_summary(username: str, week_start: str) -> dict:
    """Return 7 days of macro compliance starting from week_start (YYYY-MM-DD)."""
    from datetime import date as date_cls, timedelta

    users = get_users()
    if username not in users:
        raise HTTPException(status_code=404, detail="User not found")
    profile = UserProfile(**users[username])
    logs = get_logs()

    start = date_cls.fromisoformat(week_start)
    days = []
    for i in range(7):
        d = start + timedelta(days=i)
        date_str = d.isoformat()
        day_logs = logs.get(f"{username}_{date_str}", [])

        consumed_cal = sum(
            m.get("macro_fit", {}).get("calories_achieved", 0) for m in day_logs
        )
        consumed_prot = sum(
            m.get("macro_fit", {}).get("protein_achieved", 0) for m in day_logs
        )

        if profile.target_calories:
            cal_diff_pct = abs(consumed_cal - profile.target_calories) / profile.target_calories * 100
            cal_pct = max(0.0, round(100 - cal_diff_pct, 1))
        else:
            cal_pct = 0.0

        if profile.target_protein:
            prot_pct = min(100.0, round((consumed_prot / profile.target_protein) * 100, 1))
        else:
            prot_pct = 0.0

        # overall compliance = average of the two most important metrics
        compliance = round((cal_pct + prot_pct) / 2, 1)

        days.append({
            "date": date_str,
            "calories_pct": cal_pct,
            "protein_pct": prot_pct,
            "compliance": compliance,
            "meal_count": len(day_logs),
        })

    return {"username": username, "week_start": week_start, "days": days}
