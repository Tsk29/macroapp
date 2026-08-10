from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Recipe(BaseModel):
    name: str
    cuisine: str | None = None
    ingredients: list[str] = Field(default_factory=list)
    instructions: str
    calories: int = 0
    protein_grams: int = 0
    missing_ingredients: list[str] = Field(default_factory=list)
    servings: int = 1
    source: str | None = None
    meal_type: str | None = None


class MealPlan(BaseModel):
    meals: list[Recipe] = Field(default_factory=list)
    total_calories: int = 0
    total_protein: int = 0


class AppState(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    user_prompt: str | None = None
    cuisine_preferences: list[str] = Field(default_factory=list)
    mode: Literal["single_meal", "full_day"] = "single_meal"
    meal_type: str | None = "Lunch"
    pantry_items: list[str] = Field(default_factory=list)
    available_inventory: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
    recipe_history: list[str] = Field(default_factory=list)
    meal_plan: MealPlan = Field(default_factory=MealPlan)
    last_generated: datetime | None = None
    recipe: Recipe | None = None
    generated_recipe: Recipe | None = None
    display_recipe: Recipe | None = None
    suggested_recipes: list[Recipe] = Field(default_factory=list)
    shopping_estimate: float | None = None
    scraper_report: str | None = None
    uploaded_image_name: str | None = None
    input_source: Literal["text", "image", "upload"] = "text"
    cuisine_selected: str | None = None

    def validate_zero_waste(self) -> None:
        inventory = {item.strip().lower() for item in self.available_inventory if item.strip()}
        if not inventory:
            inventory = {item.strip().lower() for item in self.pantry_items if item.strip()}

        recipe = self.generated_recipe or self.recipe
        if recipe is not None:
            actual_ingredients = {ing.strip().lower() for ing in recipe.ingredients if ing.strip()}
            if inventory and not (actual_ingredients & inventory):
                raise ValueError(
                    "generated_recipe must include at least one available inventory item"
                )

            expected_missing = {
                ing for ing in actual_ingredients if ing not in inventory and ing != "water"
            }
            reported_missing = {ing.strip().lower() for ing in recipe.missing_ingredients if ing.strip()}
            if reported_missing != expected_missing:
                raise ValueError(
                    "generated_recipe.missing_ingredients must exactly reflect recipe ingredients not in available_inventory"
                )
