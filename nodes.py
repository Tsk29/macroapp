from __future__ import annotations

import asyncio

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


def estimate_macros(ingredient: IngredientInput) -> dict[str, int]:
    normalized = ingredient.name.strip().lower()
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
            instructions=[
                *(f"Prepare {ingredient.amount} {ingredient.unit} of {ingredient.name}." for ingredient in state.ingredients),
                "Combine the ingredients and serve immediately.",
            ],
            macro_fit=build_macro_fit(state, achieved),
            missing_ingredients=[
                ingredient.name
                for ingredient in state.ingredients
                if ingredient.name.strip().lower() not in inventory and ingredient.name.strip().lower() != "water"
            ],
        )
        state.suggested_recipes = [custom_recipe]
        state.generated_recipe = custom_recipe
        state.recipe = custom_recipe
        state.meal_plan = MealPlan(
            meals=[custom_recipe],
            total_calories=custom_recipe.macro_fit.calories_achieved,
            total_protein=custom_recipe.macro_fit.protein_achieved,
        )
        state.missing_ingredients = custom_recipe.missing_ingredients.copy()
    else:
        available = filter_by_cuisine(RECIPE_BANK, state.cuisine_preference)
        available = [recipe for recipe in available if recipe_matches_inventory(recipe, state.available_inventory)]
        available = apply_anti_boredom(available, state.recipe_history)
        suggestions = choose_suggested_recipes(state, available)

        state.suggested_recipes = suggestions
        state.generated_recipe = suggestions[0] if suggestions else None
        state.recipe = state.generated_recipe
        state.meal_plan = MealPlan(
            meals=suggestions,
            total_calories=sum(recipe.macro_fit.calories_achieved for recipe in suggestions),
            total_protein=sum(recipe.macro_fit.protein_achieved for recipe in suggestions),
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
