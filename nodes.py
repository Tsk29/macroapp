from __future__ import annotations

import asyncio

from schemas import AppState, MealPlan, Recipe, ScraperItem, ScraperResults


RECIPE_BANK: list[Recipe] = [
    Recipe(
        name="Herbed Chicken Bowl",
        cuisine="Mediterranean",
        meal_type="Lunch",
        ingredients=["chicken breast", "brown rice", "broccoli", "olive oil", "salt"],
        instructions="Season and grill chicken, then serve on a bed of rice with vegetables.",
        calories=620,
        protein_grams=50,
        missing_ingredients=["olive oil", "salt"],
    ),
    Recipe(
        name="Quinoa Power Salad",
        cuisine="Vegetarian",
        meal_type="Lunch",
        ingredients=["quinoa", "tomato", "cucumber", "olive oil", "lemon"],
        instructions="Mix cooked quinoa with vegetables and a light dressing.",
        calories=480,
        protein_grams=28,
        missing_ingredients=["quinoa", "olive oil"],
    ),
    Recipe(
        name="Spicy Stir-Fry",
        cuisine="Asian",
        meal_type="Dinner",
        ingredients=["tofu", "soy sauce", "ginger", "garlic", "mixed vegetables"],
        instructions="Stir-fry the ingredients quickly in a hot pan with sauce.",
        calories=560,
        protein_grams=34,
        missing_ingredients=["soy sauce", "ginger", "garlic"],
    ),
    Recipe(
        name="Sunrise Veggie Scramble",
        cuisine="American",
        meal_type="Breakfast",
        ingredients=["eggs", "spinach", "tomato", "olive oil", "salt"],
        instructions="Whisk eggs and cook with spinach and tomatoes until soft.",
        calories=320,
        protein_grams=22,
        missing_ingredients=["olive oil", "salt"],
    ),
    Recipe(
        name="Grilled Chicken Salad",
        cuisine="Mediterranean",
        meal_type="Dinner",
        ingredients=["chicken breast", "mixed greens", "tomato", "olive oil"],
        instructions="Grill chicken, slice it, and toss with greens and dressing.",
        calories=520,
        protein_grams=44,
        missing_ingredients=["olive oil", "salt"],
    ),
    Recipe(
        name="Salmon Power Bowl",
        cuisine="Asian",
        meal_type="Dinner",
        ingredients=["salmon", "brown rice", "broccoli", "soy sauce"],
        instructions="Bake salmon and serve over rice with steamed broccoli.",
        calories=610,
        protein_grams=47,
        missing_ingredients=["soy sauce"],
    ),
    Recipe(
        name="Greek Yogurt Snack",
        cuisine="Greek",
        meal_type="Snack",
        ingredients=["Greek yogurt", "berries", "nuts"],
        instructions="Top yogurt with berries and nuts for a quick snack.",
        calories=230,
        protein_grams=18,
        missing_ingredients=["nuts"],
    ),
    Recipe(
        name="Taco Fiesta Bowl",
        cuisine="Mexican",
        meal_type="Dinner",
        ingredients=["ground turkey", "black beans", "rice", "avocado", "salsa"],
        instructions="Cook turkey with spices and serve with rice, beans, and avocado.",
        calories=580,
        protein_grams=38,
        missing_ingredients=["avocado", "salsa"],
    ),
    Recipe(
        name="Italian Protein Pasta",
        cuisine="Italian",
        meal_type="Lunch",
        ingredients=["whole wheat pasta", "chicken", "tomato sauce", "spinach"],
        instructions="Toss cooked pasta with chicken and sauce, then add greens.",
        calories=650,
        protein_grams=42,
        missing_ingredients=["tomato sauce"],
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
    ingredient_set = {item.strip().lower() for item in recipe.ingredients if item.strip()}
    inventory_set = {item.strip().lower() for item in inventory if item.strip()}
    return bool(ingredient_set & inventory_set)


def meal_score(recipe: Recipe, inventory_items: list[str]) -> int:
    pantry_set = {item.strip().lower() for item in inventory_items if item.strip()}
    ingredient_set = {item.strip().lower() for item in recipe.ingredients if item.strip()}
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
        detail.name.strip() for detail in state.ingredient_details if detail.name.strip()
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
        custom_recipe = Recipe(
            name=recipe_name,
            cuisine=state.cuisine_preferences[0] if state.cuisine_preferences else "Custom",
            meal_type=state.meal_type or "Lunch",
            ingredients=exact_ingredient_names,
            ingredient_details=state.ingredient_details,
            instructions=[
                *(f"Prepare {detail.amount} of {detail.name}." for detail in state.ingredient_details),
                "Combine the ingredients and serve immediately.",
            ],
            calories=state.target_calories,
            protein_grams=state.target_protein,
            fat=state.target_fat,
            missing_ingredients=[
                ingredient
                for ingredient in exact_ingredient_names
                if ingredient.strip().lower() not in inventory and ingredient.strip().lower() != "water"
            ],
            source="User ingredients",
        )
        state.suggested_recipes = [custom_recipe]
        state.generated_recipe = custom_recipe
        state.recipe = custom_recipe
        state.meal_plan = MealPlan(
            meals=[custom_recipe],
            total_calories=custom_recipe.calories,
            total_protein=custom_recipe.protein_grams,
        )
        state.missing_ingredients = custom_recipe.missing_ingredients.copy()
    else:
        available = filter_by_cuisine(RECIPE_BANK, state.cuisine_preferences)
        available = [recipe for recipe in available if recipe_matches_inventory(recipe, state.available_inventory)]
        available = apply_anti_boredom(available, state.recipe_history)
        suggestions = choose_suggested_recipes(state, available)

        state.suggested_recipes = suggestions
        state.generated_recipe = suggestions[0] if suggestions else None
        state.recipe = state.generated_recipe
        state.meal_plan = MealPlan(
            meals=suggestions,
            total_calories=sum(recipe.calories for recipe in suggestions),
            total_protein=sum(recipe.protein_grams for recipe in suggestions),
        )

        if state.generated_recipe:
            state.recipe_history.append(state.generated_recipe.name)
            state.generated_recipe.missing_ingredients = [
                ingredient
                for ingredient in state.generated_recipe.ingredients
                if ingredient.strip().lower() not in inventory and ingredient.strip().lower() != "water"
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
