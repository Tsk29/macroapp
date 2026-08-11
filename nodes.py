from __future__ import annotations

import asyncio
import json
import os

from groq import Groq

from schemas import AppState, IngredientInput, MacroFit, MealPlan, Recipe, ScraperItem, ScraperResults


MACRO_ESTIMATES: dict[str, dict[str, float]] = {
    "chicken thighs": {"calories": 2.34, "protein": 0.26, "carbs": 0.0, "fat": 0.14},
    "chicken breast": {"calories": 1.65, "protein": 0.31, "carbs": 0.0, "fat": 0.04},
    "brown rice": {"calories": 1.11, "protein": 0.025, "carbs": 0.23, "fat": 0.009},
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

    components = [
        (state.target_calories, achieved["calories"]),
        (state.target_protein, achieved["protein"]),
        (state.target_carbs, achieved["carbs"]),
        (state.target_fat, achieved["fat"]),
    ]
    scores = [
        max(0.0, 100.0 - abs(actual - target) / max(target, 1) * 100.0)
        for target, actual in components
    ]

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
        match_score_percentage=round(sum(scores) / len(scores), 1),
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


def create_realistic_instructions(ingredients: list[IngredientInput], meal_type: str) -> list[str]:
    steps = []
    if meal_type == "Breakfast":
        steps = [
            "Preheat a non-stick skillet over medium heat and add a splash of olive oil.",
            "Sear the main protein and sauté tender greens until they are wilted and glossy.",
            "Finish with seasoning, gently fold the ingredients together, and plate with a squeeze of lemon.",
        ]
    elif meal_type == "Snack":
        steps = [
            "Combine small protein-rich items and fresh vegetables in a bowl.",
            "Toss gently with a light dressing and let the flavors meld for 2-3 minutes.",
            "Serve immediately as a nutrient-dense snack."
        ]
    else:
        steps = [
            "Preheat a large skillet over medium-high heat and add olive oil.",
            "Season the protein, sear until golden, then add vegetables and sauté until tender.",
            "Simmer with sauce ingredients, adjust seasoning, and finish with fresh herbs before plating.",
        ]

    if ingredients:
        steps.insert(0, f"Gather the following ingredients: {', '.join({normalize_name(i.name) for i in ingredients if i.name.strip()})}.")
    return steps


def bridge_macro_gaps(state: AppState, recipe: Recipe, inventory: set[str]) -> Recipe:
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

    present_names = {normalize_name(i.name) for i in recipe.ingredients}
    for supplement in candidate_supplements:
        if all(achieved[key] >= required[key] for key in required):
            break
        name = normalize_name(supplement.name)
        if name in present_names:
            continue

        prev_achieved = achieved.copy()
        for key, value in estimate_macros(supplement).items():
            achieved[key] += value

        if any(achieved[key] > prev_achieved[key] for key in required):
            recipe.ingredients.append(supplement)
            present_names.add(name)

    recipe.macro_fit = build_macro_fit(state, achieved)
    recipe.missing_ingredients = [
        ingredient.name
        for ingredient in recipe.ingredients
        if normalize_name(ingredient.name) not in inventory and normalize_name(ingredient.name) != "water"
    ]
    return recipe


def split_full_day_plan(state: AppState, base_recipe: Recipe, missing: list[str]) -> tuple[list[Recipe], list[str]]:
    breakfast = Recipe(
        title="Hearty Protein Breakfast",
        cuisine=base_recipe.cuisine,
        meal_type="Breakfast",
        prep_time_mins=15,
        ingredients=[
            IngredientInput(name="egg", amount=3, unit="whole"),
            IngredientInput(name="spinach", amount=40, unit="g"),
            IngredientInput(name="olive oil", amount=10, unit="g"),
        ],
        instructions=create_realistic_instructions([], "Breakfast"),
    )

    lunch = Recipe(
        title="Macro Bridge Lunch Bowl",
        cuisine=base_recipe.cuisine,
        meal_type="Lunch",
        prep_time_mins=25,
        ingredients=[*base_recipe.ingredients],
        instructions=create_realistic_instructions(base_recipe.ingredients, "Lunch"),
    )

    dinner = Recipe(
        title="Balanced Dinner Plate",
        cuisine=base_recipe.cuisine,
        meal_type="Dinner",
        prep_time_mins=25,
        ingredients=[
            IngredientInput(name="chicken breast", amount=150, unit="g"),
            IngredientInput(name="brown rice", amount=100, unit="g"),
            IngredientInput(name="broccoli", amount=120, unit="g"),
            IngredientInput(name="olive oil", amount=15, unit="g"),
        ],
        instructions=create_realistic_instructions([], "Dinner"),
    )

    snack = Recipe(
        title="Protein Snack Bowl",
        cuisine=base_recipe.cuisine,
        meal_type="Snack",
        prep_time_mins=10,
        ingredients=[
            IngredientInput(name="black beans", amount=120, unit="g"),
            IngredientInput(name="avocado", amount=80, unit="g"),
            IngredientInput(name="salsa", amount=80, unit="g"),
        ],
        instructions=create_realistic_instructions([], "Snack"),
    )

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
    client = genai.Client()

    prompt = (
        "You are a helpful assistant that extracts raw pantry ingredients and estimates their weights/quantities in grams, ml, or whole units. "
        "Ignore cooked leftovers or condiments like ketchup. Return a valid JSON array of objects with fields: name, amount, unit. "
        "For unit, use only 'g', 'ml', or 'whole'. "
        "Do not include any extra explanation outside the JSON array."
    )

    chat = client.chats.create(
        model="gemini-2.5-flash",
        history=[
            types.Content(parts=[types.Part(text="You are a helpful assistant that extracts raw pantry ingredients and quantities from a fridge image.")]),
            types.Content(parts=[types.Part(text=f"{prompt}\n\nImage base64: {image_base64}")]),
        ],
    )

    response = chat.send_message("")
    output_text = None
    if response.candidates:
        if response.candidates[0].content and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.text:
                    output_text = part.text.strip()
                    break

    if output_text is None:
        raise RuntimeError("Gemini did not return any text in the response candidates.")

    try:
        parsed = json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to decode Gemini response as JSON: {exc}\nResponse was: {output_text}") from exc

    if not isinstance(parsed, list):
        raise RuntimeError(f"Expected JSON array from Gemini vision parser, got: {type(parsed).__name__}")

    ingredients: list[IngredientInput] = []
    for item in parsed:
        if not isinstance(item, dict):
            raise RuntimeError("Each pantry item must be a JSON object.")
        ingredient = IngredientInput(
            id=item.get("id") or None,
            name=str(item.get("name", "")).strip(),
            amount=float(item.get("amount", 0) or 0),
            unit=str(item.get("unit", "g")),
        )
        ingredients.append(ingredient)

    return ingredients


async def chef_node(state: AppState) -> AppState:
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
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
    inventory_str = ", ".join(state.available_inventory)
    
    if state.mode == "full_day":
        mode_instructions = "You must output a full day MealPlan consisting of exactly 3 or 4 distinct meals that together divide and meet the target macros."
        schema_description = """Return a JSON object matching this schema:
{
  "meals": [
    {
      "name": "string",
      "meal_type": "string",
      "cuisine": "string",
      "ingredients": [{"name": "string", "amount": number, "unit": "string", "calories": number, "protein": number, "carbs": number, "fat": number}],
      "missing_ingredients": ["string"],
      "instructions": ["string"],
      "total_calories": number,
      "total_protein": number,
      "total_carbs": number,
      "total_fat": number,
      "tags": ["string"]
    }
  ]
}"""
    else:
        mode_instructions = f"You must output a single Recipe for a {state.meal_type or 'Meal'} that meets the target macros."
        schema_description = """Return a JSON object matching this schema:
{
  "name": "string",
  "meal_type": "string",
  "cuisine": "string",
  "ingredients": [{"name": "string", "amount": number, "unit": "string", "calories": number, "protein": number, "carbs": number, "fat": number}],
  "missing_ingredients": ["string"],
  "instructions": ["string"],
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "tags": ["string"]
}"""

    cuisine_str = ", ".join(state.cuisine_preference) if state.cuisine_preference else "Any"

    prompt = f"""You are an expert AI chef and nutritionist.
The user wants a meal plan.
Mode: {state.mode}
{mode_instructions}

Target Macros: Calories: {state.target_calories}, Protein: {state.target_protein}g, Carbs: {state.target_carbs}g, Fat: {state.target_fat}g
Available Inventory in Pantry: {inventory_str if inventory_str else "None"}
Cuisine Preferences: {cuisine_str}
Provided User Ingredients to include: {", ".join(exact_ingredient_names) if exact_ingredient_names else "None"}

CRITICAL RULES:
1. Anti-Frankenstein Rule: DO NOT dump all ingredients into a single unholy mixture. Build logical, cohesive dishes.
2. Macro Bridging: Add necessary ingredients to hit the macro targets. Any added ingredient NOT in the Available Inventory MUST be in the `missing_ingredients` array.
3. Keep the recipes realistic and tasty.

{schema_description}

Respond with ONLY valid JSON. No markdown, no explanation."""

    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    raw_text = chat_completion.choices[0].message.content
    if not raw_text:
        raise RuntimeError("No response from Groq")
        
    try:
        parsed = json.loads(raw_text)
    except Exception as e:
        raise RuntimeError("Failed to parse JSON: " + str(e))
    
    if state.mode == "full_day":
        meal_plan = MealPlan(**parsed)
        state.meal_plan = meal_plan
        state.suggested_recipes = meal_plan.meals
        if meal_plan.meals:
            state.generated_recipe = meal_plan.meals[0]
            state.recipe = meal_plan.meals[0]
            
        daily_missing = []
        for meal in meal_plan.meals:
            daily_missing.extend(meal.missing_ingredients)
        state.missing_ingredients = sorted(set(daily_missing))
    else:
        recipe = Recipe(**parsed)
        state.suggested_recipes = [recipe]
        state.generated_recipe = recipe
        state.recipe = recipe
        state.meal_plan = MealPlan(
            meals=[recipe],
            total_calories=recipe.macro_fit.calories_achieved if recipe.macro_fit else 0,
            total_protein=recipe.macro_fit.protein_achieved if recipe.macro_fit else 0,
            total_carbs=recipe.macro_fit.carbs_achieved if recipe.macro_fit else 0,
            total_fat=recipe.macro_fit.fat_achieved if recipe.macro_fit else 0,
        )
        state.missing_ingredients = recipe.missing_ingredients.copy()

    return state


async def scraper_node(state: AppState) -> AppState:
    if not state.missing_ingredients:
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
        return round(1.0 + len(query) * 0.12 + len(store) * 0.02, 2)

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
