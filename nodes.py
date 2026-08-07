from __future__ import annotations

import asyncio

from schemas import AppState, MealPlan, Recipe


async def vision_node(state: AppState) -> AppState:
    state.pantry_items = state.pantry_items or ["chicken breast", "brown rice", "broccoli"]
    state.missing_ingredients = ["olive oil", "salt"]
    return state


async def chef_node(state: AppState) -> AppState:
    recipe = Recipe(
        name="Grilled Chicken Bowl",
        cuisine=state.cuisine_preferences[0] if state.cuisine_preferences else "Mediterranean",
        ingredients=["chicken breast", "brown rice", "broccoli", "olive oil", "salt"],
        instructions=(
            "Season the chicken, grill until cooked, then serve over rice "
            "with steamed broccoli."
        ),
        calories=640,
        protein_grams=52,
        missing_ingredients=state.missing_ingredients,
    )

    state.meal_plan = MealPlan(
        meals=[recipe],
        total_calories=recipe.calories,
        total_protein=recipe.protein_grams,
    )
    state.recipe_history.append(recipe.name)
    state.recipe = recipe
    return state


async def scraper_node(state: AppState) -> AppState:
    if not state.missing_ingredients:
        return state

    await asyncio.sleep(0.1)
    state.shopping_estimate = len(state.missing_ingredients) * 2.5
    state.scraper_report = (
        f"Found {len(state.missing_ingredients)} missing ingredients online "
        "and estimated the cost."
    )
    return state
