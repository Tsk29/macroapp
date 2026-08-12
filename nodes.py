from __future__ import annotations

import asyncio
import base64
import json
import os

from groq import Groq
import chromadb
from duckduckgo_search import DDGS
import urllib.request
import urllib.error

try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    grocery_collection = chroma_client.get_collection(name="groceries")
except Exception as e:
    grocery_collection = None
    print(f"Warning: ChromaDB not available. {e}")

def search_grocery_db(query: str) -> dict:
    """Search for a grocery item and return its store and price."""
    if not grocery_collection:
        return {"error": "Database not initialized"}
    try:
        results = grocery_collection.query(
            query_texts=[query],
            n_results=1
        )
        if results and results['metadatas'] and len(results['metadatas'][0]) > 0:
            return results['metadatas'][0][0]
        return {"error": "Not found"}
    except Exception as e:
        return {"error": str(e)}
from schemas import AppState, IngredientInput, MacroFit, MealPlan, Recipe, ScraperItem, ScraperResults


MACRO_ESTIMATES: dict[str, dict[str, float]] = {
    "chicken thighs": {"calories": 2.34, "protein": 0.26, "carbs": 0.0, "fat": 0.14},
    "chicken breast": {"calories": 1.65, "protein": 0.31, "carbs": 0.0, "fat": 0.04},
    "brown rice": {"calories": 1.11, "protein": 0.025, "carbs": 0.23, "fat": 0.009},
    "rice": {"calories": 1.30, "protein": 0.027, "carbs": 0.28, "fat": 0.003},
    "white rice": {"calories": 1.30, "protein": 0.027, "carbs": 0.28, "fat": 0.003},
    "avocado": {"calories": 1.60, "protein": 0.02, "carbs": 0.085, "fat": 0.147},
    "broccoli": {"calories": 0.34, "protein": 0.028, "carbs": 0.07, "fat": 0.003},
    "olive oil": {"calories": 8.84, "protein": 0.0, "carbs": 0.0, "fat": 1.0},
    "feta cheese": {"calories": 2.64, "protein": 0.14, "carbs": 0.04, "fat": 0.21},
    "tomato": {"calories": 0.18, "protein": 0.009, "carbs": 0.039, "fat": 0.002},
    "cucumber": {"calories": 0.16, "protein": 0.007, "carbs": 0.037, "fat": 0.001},
    "quinoa": {"calories": 1.20, "protein": 0.042, "carbs": 0.21, "fat": 0.02},
    "tofu": {"calories": 1.76, "protein": 0.08, "carbs": 0.02, "fat": 0.11},
    "egg": {"calories": 1.55, "protein": 0.13, "carbs": 0.01, "fat": 0.11},
    "salmon": {"calories": 2.08, "protein": 0.20, "carbs": 0.0, "fat": 0.13},
    "ground turkey": {"calories": 1.66, "protein": 0.29, "carbs": 0.0, "fat": 0.09},
    "black beans": {"calories": 1.34, "protein": 0.09, "carbs": 0.24, "fat": 0.01},
    "whole wheat pasta": {"calories": 1.57, "protein": 0.06, "carbs": 0.31, "fat": 0.02},
    "spinach": {"calories": 0.23, "protein": 0.029, "carbs": 0.04, "fat": 0.004},
}


def normalize_name(name: str) -> str:
    return name.strip().lower()


def estimate_macros(ingredient: IngredientInput) -> dict[str, int]:
    normalized = normalize_name(ingredient.name)
    amount = ingredient.amount
    if ingredient.unit == "whole":
        amount *= 100

    rate = MACRO_ESTIMATES.get(normalized, {"calories": 2.0, "protein": 0.1, "carbs": 0.1, "fat": 0.05})
    return {
        "calories": round(amount * rate["calories"]),
        "protein": round(amount * rate["protein"]),
        "carbs": round(amount * rate["carbs"]),
        "fat": round(amount * rate["fat"]),
    }


def build_macro_fit(state: AppState, achieved: dict[str, int]) -> MacroFit:
    def delta(target: int, actual: int) -> int:
        return actual - target

    target_cal = state.target_calories
    target_pro = state.target_protein
    target_carb = state.target_carbs
    target_fat = state.target_fat

    eval_cal = target_cal
    eval_pro = target_pro
    eval_carb = target_carb
    eval_fat = target_fat

    if state.mode == "single_meal" and target_cal > 1000:
        eval_cal = int(target_cal * 0.38)
        eval_pro = int(target_pro * 0.38)
        eval_carb = int(target_carb * 0.38)
        eval_fat = int(target_fat * 0.38)

    components = [
        (eval_cal, achieved["calories"]),
        (eval_pro, achieved["protein"]),
        (eval_carb, achieved["carbs"]),
        (eval_fat, achieved["fat"]),
    ]

    scores = []
    for target, actual in components:
        if target <= 0:
            scores.append(100.0 if actual > 0 else 50.0)
        else:
            diff = abs(actual - target)
            rel_err = diff / target
            score = max(0.0, (1.0 - rel_err) * 100.0)
            scores.append(score)

    match_score = round(sum(scores) / len(scores), 1)

    return MacroFit(
        calories_target=state.target_calories,
        calories_achieved=achieved["calories"],
        calories_delta=delta(state.target_calories, achieved["calories"]),
        protein_target=state.target_protein,
        protein_achieved=achieved["protein"],
        protein_delta=delta(state.target_protein, achieved["protein"]),
        carbs_target=state.target_carbs,
        carbs_achieved=achieved["carbs"],
        carbs_delta=delta(state.target_carbs, achieved["carbs"]),
        fat_target=state.target_fat,
        fat_achieved=achieved["fat"],
        fat_delta=delta(state.target_fat, achieved["fat"]),
        match_score_percentage=match_score,
    )


RECIPE_BANK: list[Recipe] = [
    Recipe(
        title="Herbed Chicken Bowl",
        cuisine="Mediterranean",
        prep_time_mins=25,
        ingredients=[
            IngredientInput(name="chicken breast", amount=150, unit="g"),
            IngredientInput(name="brown rice", amount=100, unit="g"),
            IngredientInput(name="broccoli", amount=120, unit="g"),
            IngredientInput(name="olive oil", amount=15, unit="g"),
            IngredientInput(name="salt", amount=1, unit="whole"),
        ],
        instructions=["Season and grill chicken, then serve on a bed of rice with vegetables."],
        macro_fit=MacroFit(
            calories_target=0,
            calories_achieved=620,
            calories_delta=620,
            protein_target=0,
            protein_achieved=50,
            protein_delta=50,
            carbs_target=0,
            carbs_achieved=60,
            carbs_delta=60,
            fat_target=0,
            fat_achieved=18,
            fat_delta=18,
            match_score_percentage=0.0,
        ),
        missing_ingredients=["olive oil", "salt"],
    ),
    Recipe(
        title="Quinoa Power Salad",
        cuisine="Vegetarian",
        prep_time_mins=20,
        ingredients=[
            IngredientInput(name="quinoa", amount=100, unit="g"),
            IngredientInput(name="tomato", amount=80, unit="g"),
            IngredientInput(name="cucumber", amount=80, unit="g"),
            IngredientInput(name="olive oil", amount=10, unit="g"),
            IngredientInput(name="lemon", amount=1, unit="whole"),
        ],
        instructions=["Mix cooked quinoa with vegetables and a light dressing."],
        macro_fit=MacroFit(
            calories_target=0,
            calories_achieved=480,
            calories_delta=480,
            protein_target=0,
            protein_achieved=28,
            protein_delta=28,
            carbs_target=0,
            carbs_achieved=55,
            carbs_delta=55,
            fat_target=0,
            fat_achieved=18,
            fat_delta=18,
            match_score_percentage=0.0,
        ),
        missing_ingredients=["quinoa", "olive oil"],
    ),
    Recipe(
        title="Spicy Tofu Stir-Fry",
        cuisine="Asian",
        meal_type="Dinner",
        prep_time_mins=20,
        ingredients=[
            IngredientInput(name="tofu", amount=140, unit="g"),
            IngredientInput(name="soy sauce", amount=15, unit="ml"),
            IngredientInput(name="garlic", amount=5, unit="g"),
            IngredientInput(name="ginger", amount=8, unit="g"),
            IngredientInput(name="mixed vegetables", amount=200, unit="g"),
        ],
        instructions=["Stir-fry tofu and vegetables in soy sauce until cooked through."],
        macro_fit=MacroFit(
            calories_target=0,
            calories_achieved=560,
            calories_delta=560,
            protein_target=0,
            protein_achieved=34,
            protein_delta=34,
            carbs_target=0,
            carbs_achieved=45,
            carbs_delta=45,
            fat_target=0,
            fat_achieved=24,
            fat_delta=24,
            match_score_percentage=0.0,
        ),
        missing_ingredients=["soy sauce", "ginger", "garlic"],
    ),
    Recipe(
        title="Sunrise Veggie Scramble",
        cuisine="American",
        meal_type="Breakfast",
        prep_time_mins=15,
        ingredients=[
            IngredientInput(name="egg", amount=3, unit="whole"),
            IngredientInput(name="spinach", amount=40, unit="g"),
            IngredientInput(name="tomato", amount=60, unit="g"),
            IngredientInput(name="olive oil", amount=10, unit="g"),
            IngredientInput(name="salt", amount=1, unit="whole"),
        ],
        instructions=["Whisk eggs and cook with spinach and tomatoes until soft."],
        macro_fit=MacroFit(
            calories_target=0,
            calories_achieved=320,
            calories_delta=320,
            protein_target=0,
            protein_achieved=22,
            protein_delta=22,
            carbs_target=0,
            carbs_achieved=6,
            carbs_delta=6,
            fat_target=0,
            fat_achieved=20,
            fat_delta=20,
            match_score_percentage=0.0,
        ),
        missing_ingredients=["olive oil", "salt"],
    ),
]


def filter_by_cuisine(recipes: list[Recipe], preferences: list[str]) -> list[Recipe]:
    if not preferences:
        return recipes
    normalized = {c.strip().lower() for c in preferences if c.strip()}
    filtered = []
    for recipe in recipes:
        if recipe.cuisine and recipe.cuisine.lower() in normalized:
            filtered.append(recipe)
    return filtered or recipes


def apply_anti_boredom(recipes: list[Recipe], history: list[str]) -> list[Recipe]:
    return sorted(recipes, key=lambda recipe: (recipe.name in history, recipe.name))


def recipe_matches_inventory(recipe: Recipe, inventory: list[str]) -> bool:
    ingredient_set = {ing.name.strip().lower() for ing in recipe.ingredients if ing.name.strip()}
    inventory_set = {item.strip().lower() for item in inventory if item.strip()}
    return bool(ingredient_set & inventory_set)


def meal_score(recipe: Recipe, inventory_items: list[str]) -> int:
    pantry_set = {item.strip().lower() for item in inventory_items if item.strip()}
    ingredient_set = {ing.name.strip().lower() for ing in recipe.ingredients if ing.name.strip()}
    return len(pantry_set & ingredient_set)


def build_full_day_plan(state: AppState, recipes: list[Recipe]) -> tuple[list[Recipe], Recipe]:
    meal_order = ["Breakfast", "Lunch", "Dinner", "Snack"]
    best_by_type: dict[str, Recipe] = {}

    for recipe in recipes:
        if recipe.meal_type not in meal_order:
            continue
        current = best_by_type.get(recipe.meal_type)
        if current is None:
            best_by_type[recipe.meal_type] = recipe
            continue

        new_score = meal_score(recipe, state.available_inventory)
        current_score = meal_score(current, state.available_inventory)
        if new_score > current_score or (
            new_score == current_score and recipe.name < current.name
        ):
            best_by_type[recipe.meal_type] = recipe

    meals = [best_by_type[meal_type] for meal_type in meal_order if meal_type in best_by_type]
    if not meals:
        meals = recipes[:1]
    return meals, meals[0]



async def generate_recipe_llm(ingredients: list[IngredientInput], cuisine: str, meal_type: str) -> dict:
    if not ingredients:
        return {"title": f"{cuisine} {meal_type}", "meal_structure": "Single Plate", "instructions": ["Prep ingredients", "Cook", "Serve"]}
    
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    ingredient_list = ", ".join(f"{i.amount}{i.unit} {i.name}" for i in ingredients)
    
    prompt = f"""You are a Michelin-star chef specializing in {cuisine}.
You must strictly adhere to the flavor profiles and cooking techniques of {cuisine}. Do not hallucinate fusion dishes unless explicitly asked.

RULE 2: THE "NO-SLOP" MANDATE (SEPARATION OF CONCERNS): NEVER mix incompatible ingredients into a single bowl or pot just because the user provided them. If the user provides Chicken, Pasta, and Black Beans, structure the recipe properly: "Pan-Seared Chicken" (Main) with "Garlic Pasta" (Side 1) and "Spiced Beans" (Side 2). Cook them separately.
RULE 3: ZERO HALLUCINATION & INGREDIENT FILTERING: You must use the user's input ingredients as the foundation. However, if an input ingredient completely violates the {cuisine} profile, you must either serve it as a disconnected side dish OR explicitly state in the description how you creatively adapted it. Do NOT invent new primary proteins or carb bases that the user did not provide.
RULE 4: REALISTIC BRIDGING: If you must add ingredients to hit the target macros, they MUST seamlessly fit the {cuisine}. (e.g., Do not add soy sauce to an Italian dish to hit sodium/flavor targets; use parmesan or capers).
RULE 5: AUTHENTIC SPICING & NAMING: Explicitly define the exact spices, herbs, or masalas characteristic of {cuisine}. Do not just say "spices"; say "Garam Masala, Turmeric, and Cumin" for Indian, or "Oregano and Basil" for Italian. Ensure the "title" is a highly authentic and descriptive name for the dish (e.g. "Paneer Tikka Masala" instead of "Indian Cheese Bowl").

Meal Type: {meal_type}
Provided Ingredients: {ingredient_list}

Return ONLY a valid JSON object with:
- "title": A creative title for the meal.
- "meal_structure": A short string describing plating structure (e.g., "Main + 2 Sides", "Single Bowl").
- "instructions": An array of strings with step-by-step instructions.
- "additional_ingredients": An array of strings containing any other ingredients you used in the instructions (e.g. olive oil, salt, spices) that were not in the provided ingredients list."""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Groq generation failed: {e}")
        return {"title": f"{cuisine} {meal_type}", "meal_structure": "Single Plate", "instructions": ["Cook ingredients.", "Serve."]}


def create_realistic_instructions(ingredients: list[IngredientInput], meal_type: str) -> list[str]:
    if not ingredients:
        return [
            "Preheat a large skillet over medium-high heat with a splash of olive oil.",
            "Season your fresh ingredients with salt, black pepper, and herbs.",
            "Cook protein and sauté vegetables until golden and tender.",
            "Plate cleanly and enjoy your balanced meal."
        ]

    names = []
    seen = set()
    for ing in ingredients:
        n = ing.name.strip()
        if n and n.lower() not in seen:
            seen.add(n.lower())
            names.append(n)

    grains = [n for n in names if any(k in n.lower() for k in ["rice", "quinoa", "pasta", "couscous", "oats", "potato"])]
    proteins = [n for n in names if any(k in n.lower() for k in ["chicken", "turkey", "beef", "steak", "tofu", "salmon", "tuna", "pork", "shrimp"])]
    legumes = [n for n in names if any(k in n.lower() for k in ["bean", "lentil", "chickpea"])]
    eggs = [n for n in names if "egg" in n.lower()]
    fats = [n for n in names if any(k in n.lower() for k in ["oil", "butter", "avocado"])]
    veggies = [n for n in names if n not in grains and n not in proteins and n not in legumes and n not in eggs and n not in fats]

    steps = []

    pastas = [n for n in grains if "pasta" in n.lower()]
    potatoes = [n for n in grains if "potato" in n.lower()]
    rices = [n for n in grains if n not in pastas and n not in potatoes]

    if rices:
        rice_str = " and ".join(rices)
        steps.append(f"Prepare Grain Base: Rinse the {rice_str}. Bring water or broth to a boil in a covered pot, add the {rice_str}, reduce heat to low, and simmer for 15 minutes until tender and fluffy.")
    if pastas:
        pasta_str = " and ".join(pastas)
        steps.append(f"Cook Pasta: Bring a large pot of salted water to a rolling boil. Add the {pasta_str} and cook until al dente, then drain.")
    if potatoes:
        potato_str = " and ".join(potatoes)
        steps.append(f"Prepare Potatoes: Dice the {potato_str} and either roast them in the oven with olive oil at 400°F (200°C) until crispy, or boil until fork-tender.")
    if not grains:
        steps.append("Prep Work: Wash all produce, pat ingredients dry, and assemble your cooking space.")

    if proteins:
        prot_str = " and ".join(proteins)
        oil_str = "olive oil" if any("oil" in f.lower() for f in fats) else "oil"
        steps.append(f"Sear Protein: Heat a heavy skillet over medium-high heat with {oil_str}. Season the {prot_str} with salt, black pepper, and spices. Pan-sear for 5-7 minutes per side until golden brown and fully cooked (165°F / 74°C). Rest for 3 minutes, then slice into bite-sized strips.")
    elif eggs:
        steps.append("Cook Protein: Whisk eggs with a pinch of salt and pepper.")

    sides_parts = []
    if legumes:
        sides_parts.append(f"warm the {' and '.join(legumes)} with a dash of cumin")
    if veggies:
        sides_parts.append(f"sauté the {' and '.join(veggies)} until tender-crisp")
    
    if sides_parts:
        steps.append(f"Cook Sides: In the skillet, {' and '.join(sides_parts)}.")

    if eggs and not proteins:
        steps.append(f"Cook Eggs: In a separate pan, fry or scramble the {' and '.join(eggs)} until cooked to your preference.")
    elif eggs:
        steps.append(f"Prepare Eggs: Soft-boil or fry the {' and '.join(eggs)} to serve alongside the dish.")

    toppings_parts = []
    avocado_items = [n for n in fats if "avocado" in n.lower()]
    if avocado_items:
        toppings_parts.append(f"slice the fresh {' and '.join(avocado_items)} into fans or cubes")
    if veggies:
        toppings_parts.append(f"sauté or chop the {' and '.join(veggies)}")
    if toppings_parts:
        steps.append(f"Prep Fresh Toppings: While resting the protein, {' and '.join(toppings_parts)}.")

    all_components = []
    if grains:
        all_components.append(" and ".join(grains))
    if proteins:
        all_components.append(" and ".join(proteins))
    if legumes:
        all_components.append(" and ".join(legumes))
    if avocado_items:
        all_components.append(" and ".join(avocado_items))
    if eggs:
        all_components.append(" and ".join(eggs))
    if veggies:
        all_components.append(" and ".join(veggies))

    oil_drizzle = " with a drizzle of olive oil" if any("oil" in f.lower() for f in fats) else ""
    comp_str = ", ".join(all_components) if all_components else "prepared ingredients"
    steps.append(f"Assemble & Serve: Layer the {comp_str} neatly into your bento container{oil_drizzle}. Serve warm and enjoy your high-protein meal!")

    return steps


async def bridge_macro_gaps(state: AppState, recipe: Recipe, inventory: set[str]) -> Recipe:
    achieved = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for ingredient in recipe.ingredients:
        macros = estimate_macros(ingredient)
        achieved["calories"] += macros["calories"]
        achieved["protein"] += macros["protein"]
        achieved["carbs"] += macros["carbs"]
        achieved["fat"] += macros["fat"]

    required = {
        "calories": int(state.target_calories * 0.9),
        "protein": int(state.target_protein * 0.9),
        "carbs": int(state.target_carbs * 0.9),
        "fat": int(state.target_fat * 0.9),
    }

    candidate_supplements = [
        IngredientInput(name="olive oil", amount=15, unit="g"),
        IngredientInput(name="black beans", amount=120, unit="g"),
        IngredientInput(name="avocado", amount=80, unit="g"),
        IngredientInput(name="brown rice", amount=100, unit="g"),
        IngredientInput(name="quinoa", amount=80, unit="g"),
        IngredientInput(name="egg", amount=2, unit="whole"),
    ]

    user_provided_explicitly = len(state.ingredients) > 0
    present_names = {normalize_name(i.name) for i in recipe.ingredients}
    
    for supplement in candidate_supplements:
        if all(achieved[key] >= required[key] for key in required):
            break
        name = normalize_name(supplement.name)
        if name in present_names:
            continue
            
        if user_provided_explicitly and name not in inventory:
            continue

        prev_achieved = achieved.copy()
        for key, value in estimate_macros(supplement).items():
            achieved[key] += value

        if any(achieved[key] > prev_achieved[key] for key in required):
            recipe.ingredients.append(supplement)
            present_names.add(name)

    
    recipe_dict = await generate_recipe_llm(recipe.ingredients, state.cuisine_preference[0] if state.cuisine_preference else "Custom", recipe.meal_type or "Lunch")
    recipe.title = recipe_dict.get("title", recipe.title)
    recipe.meal_structure = recipe_dict.get("meal_structure")
    recipe.instructions = recipe_dict.get("instructions", [])

    additional = recipe_dict.get("additional_ingredients", [])
    for ing_name in additional:
        recipe.ingredients.append(IngredientInput(name=ing_name, amount=1, unit="g"))

    recipe.macro_fit = build_macro_fit(state, achieved)
    recipe.missing_ingredients = [
        ingredient.name
        for ingredient in recipe.ingredients
        if normalize_name(ingredient.name) not in inventory and normalize_name(ingredient.name) != "water"
    ]
    return recipe


async def split_full_day_plan(state: AppState, base_recipe: Recipe, missing: list[str]) -> tuple[list[Recipe], list[str]]:
    b_ing = [
        IngredientInput(name="egg", amount=3, unit="whole"),
        IngredientInput(name="spinach", amount=40, unit="g"),
        IngredientInput(name="olive oil", amount=10, unit="g"),
    ]
    b_dict = await generate_recipe_llm(b_ing, base_recipe.cuisine or "Custom", "Breakfast")
    breakfast = Recipe(
        title=b_dict.get("title", "Hearty Protein Breakfast"),
        meal_structure=b_dict.get("meal_structure"),
        cuisine=base_recipe.cuisine,
        meal_type="Breakfast",
        prep_time_mins=15,
        ingredients=b_ing,
        instructions=b_dict.get("instructions", []),
    )

    additional = b_dict.get("additional_ingredients", [])
    for ing_name in additional:
        b_ing.append(IngredientInput(name=ing_name, amount=1, unit="g"))

    l_dict = await generate_recipe_llm(base_recipe.ingredients, base_recipe.cuisine or "Custom", "Lunch")
    lunch = Recipe(
        title=l_dict.get("title", "Macro Bridge Lunch Bowl"),
        meal_structure=l_dict.get("meal_structure"),
        cuisine=base_recipe.cuisine,
        meal_type="Lunch",
        prep_time_mins=25,
        ingredients=[*base_recipe.ingredients],
        instructions=l_dict.get("instructions", []),
    )

    additional = l_dict.get("additional_ingredients", [])
    for ing_name in additional:
        l_ing.append(IngredientInput(name=ing_name, amount=1, unit="g"))

    d_ing = [
        IngredientInput(name="chicken breast", amount=150, unit="g"),
        IngredientInput(name="brown rice", amount=100, unit="g"),
        IngredientInput(name="broccoli", amount=120, unit="g"),
        IngredientInput(name="olive oil", amount=15, unit="g"),
    ]
    d_dict = await generate_recipe_llm(d_ing, base_recipe.cuisine or "Custom", "Dinner")
    dinner = Recipe(
        title=d_dict.get("title", "Balanced Dinner Plate"),
        meal_structure=d_dict.get("meal_structure"),
        cuisine=base_recipe.cuisine,
        meal_type="Dinner",
        prep_time_mins=25,
        ingredients=d_ing,
        instructions=d_dict.get("instructions", []),
    )

    additional = d_dict.get("additional_ingredients", [])
    for ing_name in additional:
        d_ing.append(IngredientInput(name=ing_name, amount=1, unit="g"))

    s_ing = [
        IngredientInput(name="black beans", amount=120, unit="g"),
        IngredientInput(name="avocado", amount=80, unit="g"),
        IngredientInput(name="salsa", amount=80, unit="g"),
    ]
    s_dict = await generate_recipe_llm(s_ing, base_recipe.cuisine or "Custom", "Snack")
    snack = Recipe(
        title=s_dict.get("title", "Protein Snack Bowl"),
        meal_structure=s_dict.get("meal_structure"),
        cuisine=base_recipe.cuisine,
        meal_type="Snack",
        prep_time_mins=10,
        ingredients=s_ing,
        instructions=s_dict.get("instructions", []),
    )

    additional = s_dict.get("additional_ingredients", [])
    for ing_name in additional:
        s_ing.append(IngredientInput(name=ing_name, amount=1, unit="g"))

    meals = [breakfast, lunch, dinner, snack]
    daily_missing = []
    base_set = {normalize_name(i.name) for i in base_recipe.ingredients if i.name.strip()}

    for meal in meals:
        achieved = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        for ingredient in meal.ingredients:
            macros = estimate_macros(ingredient)
            achieved["calories"] += macros["calories"]
            achieved["protein"] += macros["protein"]
            achieved["carbs"] += macros["carbs"]
            achieved["fat"] += macros["fat"]
        meal.macro_fit = build_macro_fit(state, achieved)

        for ingredient in meal.ingredients:
            normalized = normalize_name(ingredient.name)
            if normalized not in base_set and normalized != "water":
                daily_missing.append(ingredient.name)

    return meals, sorted(set(daily_missing + missing))


def choose_suggested_recipes(state: AppState, recipes: list[Recipe]) -> list[Recipe]:
    candidates = recipes
    if state.mode == "single_meal" and state.meal_type:
        filtered = [recipe for recipe in recipes if recipe.meal_type == state.meal_type]
        candidates = filtered or recipes

    candidates = [r for r in candidates if r.name not in state.recipe_history]
    if not candidates:
        candidates = recipes

    candidates = sorted(
        candidates,
        key=lambda recipe: (
            recipe.name in state.recipe_history,
            -meal_score(recipe, state.available_inventory),
            recipe.name,
        ),
    )

    if state.mode == "single_meal":
        return candidates[:3]

    full_day_recipes, _ = build_full_day_plan(state, candidates)
    return full_day_recipes


async def vision_node(state: AppState) -> AppState:
    if state.uploaded_image_name:
        state.pantry_items = ["tomato", "spinach", "egg"]
        state.missing_ingredients = ["olive oil", "salt"]
        state.input_source = "image"
    elif state.user_prompt:
        prompt_items = [item.strip() for item in state.user_prompt.split(",") if item.strip()]
        state.pantry_items = prompt_items or ["chicken breast", "brown rice", "broccoli"]
        state.missing_ingredients = ["olive oil", "salt"]
        state.input_source = "text"
    else:
        state.pantry_items = state.pantry_items or ["chicken breast", "brown rice", "broccoli"]
        state.missing_ingredients = ["olive oil", "salt"]
    return state


async def parse_image_node(image_base64: str) -> list[IngredientInput]:
    """Parse a pantry image (base64) and return detected ingredients using Groq vision."""
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    prompt = (
        "You are a helpful assistant that extracts raw pantry ingredients from a fridge or pantry image. "
        "Estimate their weights/quantities. Ignore cooked leftovers or condiments like ketchup. "
        "Return ONLY a valid JSON array of objects with fields: name, amount, unit. "
        "For unit, use only 'g', 'ml', or 'whole'. No explanation outside the JSON array."
    )

    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                ],
            }
        ],
        model="llama-3.2-90b-vision-preview",
        response_format={"type": "json_object"},
    )

    output_text = response.choices[0].message.content
    if not output_text:
        raise RuntimeError("Groq did not return any text for the image.")

    try:
        parsed = json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to decode Groq response as JSON: {exc}\nResponse: {output_text}") from exc

    # Handle both {"ingredients": [...]} and [...] shapes
    if isinstance(parsed, dict):
        parsed = parsed.get("ingredients") or parsed.get("items") or list(parsed.values())[0]
    if not isinstance(parsed, list):
        raise RuntimeError(f"Expected JSON array, got: {type(parsed).__name__}")

    ingredients: list[IngredientInput] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        ingredient = IngredientInput(
            id=item.get("id") or None,
            name=str(item.get("name", "")).strip(),
            amount=float(item.get("amount", 0) or 0),
            unit=str(item.get("unit", "g")),
        )
        if ingredient.name:
            ingredients.append(ingredient)

    return ingredients


async def chef_node(state: AppState) -> AppState:
    exact_ingredient_names = [
        ingredient.name.strip() for ingredient in state.ingredients if ingredient.name.strip()
    ]
    state.available_inventory = [item.strip().lower() for item in state.pantry_items if item.strip()]

    inventory = set(state.available_inventory)
    if state.user_prompt:
        prompt_items = [item.strip().lower() for item in state.user_prompt.split(",") if item.strip()]
        inventory.update(prompt_items)

    if exact_ingredient_names:
        inventory.update(name.lower() for name in exact_ingredient_names)

    state.available_inventory = sorted(inventory)

    # STRICT ZERO HALLUCINATION POLICY:
    # Use only the exact ingredient names provided by the user.
    # If the user inputs 'chicken thighs', do not substitute 'chicken breast'.
    # Do not add any items that were not explicitly provided unless they are
    # specifically generated into the missing_ingredients list.
    if exact_ingredient_names:
        recipe_name = f"Custom {exact_ingredient_names[0].title()} Meal"
        achieved = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        for ingredient in state.ingredients:
            macro_totals = estimate_macros(ingredient)
            achieved["calories"] += macro_totals["calories"]
            achieved["protein"] += macro_totals["protein"]
            achieved["carbs"] += macro_totals["carbs"]
            achieved["fat"] += macro_totals["fat"]

        custom_recipe = Recipe(
            title=recipe_name,
            cuisine=state.cuisine_preference[0] if state.cuisine_preference else "Custom",
            meal_type=state.meal_type or "Lunch",
            ingredients=[ingredient for ingredient in state.ingredients],
            instructions=[],
            macro_fit=build_macro_fit(state, achieved),
            missing_ingredients=[
                ingredient.name
                for ingredient in state.ingredients
                if ingredient.name.strip().lower() not in inventory and ingredient.name.strip().lower() != "water"
            ],
        )
        custom_recipe = await bridge_macro_gaps(state, custom_recipe, inventory)

        if state.mode == "full_day":
            meals, daily_missing = await split_full_day_plan(state, custom_recipe, custom_recipe.missing_ingredients)
            state.suggested_recipes = meals
            state.generated_recipe = meals[0] if meals else custom_recipe
            state.recipe = meals[0] if meals else custom_recipe
            state.meal_plan = MealPlan(
                meals=meals,
                total_calories=sum(meal.macro_fit.calories_achieved for meal in meals),
                total_protein=sum(meal.macro_fit.protein_achieved for meal in meals),
                total_carbs=sum(meal.macro_fit.carbs_achieved for meal in meals),
                total_fat=sum(meal.macro_fit.fat_achieved for meal in meals),
            )
            state.missing_ingredients = daily_missing
        else:
            state.suggested_recipes = [custom_recipe]
            state.generated_recipe = custom_recipe
            state.recipe = custom_recipe
            state.meal_plan = MealPlan(
                meals=[custom_recipe],
                total_calories=custom_recipe.macro_fit.calories_achieved,
                total_protein=custom_recipe.macro_fit.protein_achieved,
                total_carbs=custom_recipe.macro_fit.carbs_achieved,
                total_fat=custom_recipe.macro_fit.fat_achieved,
            )
            state.missing_ingredients = custom_recipe.missing_ingredients.copy()
    else:
        available = filter_by_cuisine(RECIPE_BANK, state.cuisine_preference)
        available = [recipe for recipe in available if recipe_matches_inventory(recipe, state.available_inventory)]
        available = apply_anti_boredom(available, state.recipe_history)
        suggestions = choose_suggested_recipes(state, available)

        if state.mode == "full_day" and suggestions:
            base_recipe = suggestions[0]
            base_recipe = await bridge_macro_gaps(state, base_recipe, inventory)
            meals, daily_missing = await split_full_day_plan(state, base_recipe, base_recipe.missing_ingredients)
            state.suggested_recipes = meals
            state.generated_recipe = meals[0]
            state.recipe = meals[0]
            state.meal_plan = MealPlan(
                meals=meals,
                total_calories=sum(meal.macro_fit.calories_achieved for meal in meals),
                total_protein=sum(meal.macro_fit.protein_achieved for meal in meals),
                total_carbs=sum(meal.macro_fit.carbs_achieved for meal in meals),
                total_fat=sum(meal.macro_fit.fat_achieved for meal in meals),
            )
            state.missing_ingredients = daily_missing
        else:
            state.suggested_recipes = suggestions
            state.generated_recipe = suggestions[0] if suggestions else None
            state.recipe = state.generated_recipe
            state.meal_plan = MealPlan(
                meals=suggestions,
                total_calories=sum(recipe.macro_fit.calories_achieved for recipe in suggestions),
                total_protein=sum(recipe.macro_fit.protein_achieved for recipe in suggestions),
                total_carbs=sum(recipe.macro_fit.carbs_achieved for recipe in suggestions),
                total_fat=sum(recipe.macro_fit.fat_achieved for recipe in suggestions),
            )

            if state.generated_recipe:
                state.recipe_history.append(state.generated_recipe.name)
                state.generated_recipe.missing_ingredients = [
                    ingredient.name
                    for ingredient in state.generated_recipe.ingredients
                    if ingredient.name.strip().lower() not in inventory and ingredient.name.strip().lower() != "water"
                ]
                state.missing_ingredients = state.generated_recipe.missing_ingredients.copy()

    state.validate_zero_waste()

    return state



def search_rewe_api(query: str, zip_code: str = "10115") -> dict:
    """Simulate hitting the REWE undocumented API."""
    try:
        # We attempt a basic HTTP request to a hypothetical endpoint.
        # In reality, this will likely be blocked by Cloudflare.
        req = urllib.request.Request(
            f"https://shop.rewe.de/api/products?search={urllib.parse.quote(query)}&market={zip_code}",
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            if data and "products" in data and len(data["products"]) > 0:
                p = data["products"][0]
                return {"name": p.get("name", query), "price": p.get("price", "2.99"), "store": "Rewe API"}
            return {"error": "No products found in API"}
    except Exception as e:
        # Return the error so the LLM knows it failed and can fallback
        return {"error": f"API request blocked or failed: {str(e)}"}

def search_web_for_price(query: str) -> dict:
    """Fallback to searching the web for the price if the API is blocked."""
    try:
        with DDGS() as ddgs:
            # We search for the query + "Preis" to find German prices
            results = list(ddgs.text(f"{query} Preis euro", max_results=3))
            
            if not results:
                return {"error": "No web search results found"}
                
            # We just return the snippets to the LLM so it can extract the price
            snippets = [r.get("body", "") for r in results]
            return {"snippets": snippets}
    except Exception as e:
        return {"error": f"Web search failed: {str(e)}"}

async def scraper_node(state: AppState) -> AppState:
    if not state.missing_ingredients:
        return state

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    scraper_items: list[ScraperItem] = []
    
    try:
        # Step 1: Programmatically gather data to avoid Groq tool-calling hallucinations
        raw_data_context = ""
        for ingredient in state.missing_ingredients:
            rewe_result = search_rewe_api(ingredient)
            if "error" in rewe_result:
                web_result = search_web_for_price(f"Rewe {ingredient} Preis euro")
                raw_data_context += f"Ingredient: {ingredient}\\nWeb Search Results: {web_result}\\n\\n"
            else:
                raw_data_context += f"Ingredient: {ingredient}\\nRewe API Result: {rewe_result}\\n\\n"

        # Step 2: Use LLM strictly for parsing the raw data into JSON
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a German grocery data parser. "
                    "Extract the name, store, and price for each ingredient from the provided raw data context. "
                    "Output ONLY a JSON object with a single key 'items' containing an array of objects. "
                    "Each object must have: 'name' (string), 'store' (string), and 'price' (float). "
                    "If a price is missing, estimate a reasonable price."
                )
            },
            {
                "role": "user",
                "content": f"Raw Data Context:\\n{raw_data_context}"
            }
        ]

        final_json_response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        raw_content = final_json_response.choices[0].message.content
        parsed = json.loads(raw_content)
        items_list = parsed.get("items", [])
        
        if isinstance(items_list, list):
            for item in items_list:
                scraper_items.append(ScraperItem(
                    name=item.get("name", "Unknown"),
                    store=item.get("store", "Web Search"),
                    price=float(item.get("price", 0.0))
                ))
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Scraper LLM failed: {e}")

    # Fallback if everything fails
    if not scraper_items:
        for ingredient in state.missing_ingredients:
            scraper_items.append(ScraperItem(name=ingredient, store="Fallback", price=2.99))

    # Deduplicate items by name
    unique_items = {}
    for item in scraper_items:
        unique_items[item.name.lower()] = item
    scraper_items = list(unique_items.values())

    total_cost = sum(item.price for item in scraper_items)
    cheapest_store = min(scraper_items, key=lambda item: item.price).store if scraper_items else None

    state.scraper_results = ScraperResults(
        items=scraper_items,
        cheapest_store_overall=cheapest_store,
        total_cost=round(total_cost, 2),
    )
    state.shopping_estimate = float(state.scraper_results.total_cost)
    state.scraper_report = f"Found {len(scraper_items)} missing ingredients using Rewe API & Web Search."

    return state

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_rewe_api",
                "description": "Searches the REWE API for the price of a grocery item.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The grocery item (e.g., 'Hähnchenbrust', 'Olivenöl').",
                        },
                        "zip_code": {
                            "type": "string",
                            "description": "The German postal code (default '10115').",
                        }
                    },
                    "required": ["query"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "search_web_for_price",
                "description": "Fallback tool. Searches the live web using DuckDuckGo to find the current price of a grocery item if the API is blocked.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query (e.g., 'Rewe Hähnchenbrust Preis' or 'Aldi Olivenöl Preis').",
                        }
                    },
                    "required": ["query"],
                },
            },
        }
    ]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a German shopping assistant. The user needs to buy missing ingredients. "
                "For each ingredient, ALWAYS try the 'search_rewe_api' tool FIRST. "
                "If 'search_rewe_api' returns an error (like HTTP 403 or blocked), you MUST use the 'search_web_for_price' tool as a fallback to scrape the price from DuckDuckGo snippets. "
                "Once you have the data, summarize the lowest price found for each ingredient. "
                "IMPORTANT: ALWAYS use the native tool calling API. NEVER output raw text like <function=...>. Just call the tools normally."
            )
        },
        {
            "role": "user",
            "content": f"Please find these ingredients: {', '.join(state.missing_ingredients)}"
        }
    ]

    scraper_items: list[ScraperItem] = []
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        messages.append(response.choices[0].message)
        
        while response.choices[0].message.tool_calls:
            for tool_call in response.choices[0].message.tool_calls:
                args = json.loads(tool_call.function.arguments)
                
                if tool_call.function.name == "search_rewe_api":
                    result = search_rewe_api(args["query"], args.get("zip_code", "10115"))
                elif tool_call.function.name == "search_web_for_price":
                    result = search_web_for_price(args["query"])
                else:
                    result = {"error": "Unknown tool"}
                    
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_call.function.name,
                    "content": json.dumps(result),
                })
            
            # Send the tool results back to the LLM
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools,
            )
            messages.append(response.choices[0].message)
            
        # The LLM's final message contains the summary. 
        # We parse the text to extract the items (simplified for the demo).
        final_text = response.choices[0].message.content or ""
        
        # If the LLM successfully gathered data, we parse it into our schema
        # For robustness, we ask the LLM to output a JSON array at the very end
        messages.append({
            "role": "user",
            "content": "Now output ONLY a JSON array of objects with fields: 'name', 'store' (e.g. 'Rewe' or 'Web Search'), and 'price' (a float). No markdown, no other text."
        })
        
        final_json_response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        # We told it to return an array, but JSON object mode forces an object.
        # Let's handle if it returns {"items": [...]}
        try:
            raw_content = final_json_response.choices[0].message.content
            print("Raw LLM Response:", raw_content)
            parsed = json.loads(raw_content)
            print("Parsed LLM Response:", parsed)
            items_list = parsed.get("items") or parsed.get("ingredients") or list(parsed.values())[0]
            print("Items List:", items_list)
            if isinstance(items_list, list):
                for item in items_list:
                    print("Appending item:", item)
                    scraper_items.append(ScraperItem(
                        name=item.get("name", "Unknown"),
                        store=item.get("store", "Web Search"),
                        price=float(item.get("price", 0.0))
                    ))
        except Exception as json_err:
            print(f"Failed to parse LLM JSON summary: {json_err}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Scraper LLM failed: {e}")

    # Fallback if everything fails
    if not scraper_items:
        for ingredient in state.missing_ingredients:
            scraper_items.append(ScraperItem(name=ingredient, store="Fallback", price=2.99))

    # Deduplicate items by name
    unique_items = {}
    for item in scraper_items:
        unique_items[item.name.lower()] = item
    scraper_items = list(unique_items.values())

    total_cost = sum(item.price for item in scraper_items)
    cheapest_store = min(scraper_items, key=lambda item: item.price).store if scraper_items else None

    state.scraper_results = ScraperResults(
        items=scraper_items,
        cheapest_store_overall=cheapest_store,
        total_cost=round(total_cost, 2),
    )
    state.shopping_estimate = float(state.scraper_results.total_cost)
    state.scraper_report = f"Found {len(scraper_items)} missing ingredients using Rewe API & Web Search."

    return state

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_grocery_db",
                "description": "Searches the supermarket database for the best price of a given grocery item.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The name of the grocery item to search for (e.g., 'chicken breast', 'olive oil').",
                        }
                    },
                    "required": ["query"],
                },
            },
        }
    ]

    messages = [
        {
            "role": "system",
            "content": "You are a shopping assistant. The user needs to buy the following missing ingredients. "
                       "Use the 'search_grocery_db' tool to look up the best price and store for EACH ingredient. "
                       "After you have retrieved the info for ALL ingredients, summarize the findings."
        },
        {
            "role": "user",
            "content": f"Please find these ingredients: {', '.join(state.missing_ingredients)}"
        }
    ]

    scraper_items: list[ScraperItem] = []
    
    # We loop to allow the LLM to call the tool, then we return the results to it.
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        messages.append(response.choices[0].message)
        
        # If the LLM decided to call tools
        while response.choices[0].message.tool_calls:
            for tool_call in response.choices[0].message.tool_calls:
                if tool_call.function.name == "search_grocery_db":
                    args = json.loads(tool_call.function.arguments)
                    result = search_grocery_db(args["query"])
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "search_grocery_db",
                        "content": json.dumps(result),
                    })
                    
                    if "error" not in result:
                        scraper_items.append(ScraperItem(
                            name=result["name"],
                            store=result["store"],
                            price=float(result["price"])
                        ))
            
            # Send the tool results back to the LLM to get the final summary
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
            )
            messages.append(response.choices[0].message)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Scraper LLM failed: {e}")

    # Fallback to simulated data if tool calling completely failed or returned nothing
    if not scraper_items:
        def normalize_name(name: str) -> str:
            return name.strip().lower()
        def scrape_price_for_store(store: str, query: str) -> float:
            import hashlib
            hash_val = int(hashlib.md5(f"{store}:{query}".encode()).hexdigest(), 16)
            return round(1.0 + (hash_val % 400) / 100.0, 2)
            
        for ingredient in state.missing_ingredients:
            scraper_items.append(ScraperItem(name=ingredient, store="Lidl", price=scrape_price_for_store("Lidl", ingredient)))

    # Deduplicate items by name
    unique_items = {}
    for item in scraper_items:
        unique_items[item.name.lower()] = item
    scraper_items = list(unique_items.values())

    total_cost = sum(item.price for item in scraper_items)
    cheapest_store = min(scraper_items, key=lambda item: item.price).store if scraper_items else None

    state.scraper_results = ScraperResults(
        items=scraper_items,
        cheapest_store_overall=cheapest_store,
        total_cost=round(total_cost, 2),
    )
    state.shopping_estimate = float(state.scraper_results.total_cost)
    state.scraper_report = f"Found {len(scraper_items)} missing ingredients via local Vector DB."

    return state

    def normalize_name(name: str) -> str:
        return name.strip().lower()

    search_urls = {
        "Lidl": "https://www.lidl.de/q/search?q={}",
        "Aldi Süd": "https://www.aldi-sued.de/de/search.html?query={}",
        "Netto": "https://www.netto-online.de/explorer/search?w={}",
    }

    await asyncio.sleep(0.1)

    def scrape_price_for_store(store: str, query: str) -> float:
        import hashlib
        hash_val = int(hashlib.md5(f"{store}:{query}".encode()).hexdigest(), 16)
        return round(1.0 + (hash_val % 400) / 100.0, 2)

    scraper_items: list[ScraperItem] = []
    for ingredient in state.missing_ingredients:
        normalized = normalize_name(ingredient)
        best_price = float("inf")
        best_store = ""

        for store, template in search_urls.items():
            query = normalized.replace(" ", "+")
            _ = template.format(query)
            price = scrape_price_for_store(store, query)
            if price < best_price:
                best_price = price
                best_store = store

        scraper_items.append(ScraperItem(name=ingredient, store=best_store, price=best_price))

    total_cost = sum(item.price for item in scraper_items)
    cheapest_store = min(scraper_items, key=lambda item: item.price).store if scraper_items else None

    state.scraper_results = ScraperResults(
        items=scraper_items,
        cheapest_store_overall=cheapest_store,
        total_cost=round(total_cost, 2),
    )
    state.shopping_estimate = float(state.scraper_results.total_cost)
    state.scraper_report = (
        f"Found {len(scraper_items)} missing ingredients online across Lidl, Aldi Süd, and Netto."
    )

    return state
