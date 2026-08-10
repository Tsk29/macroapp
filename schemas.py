from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class IngredientInput(BaseModel):
    name: str
    amount: float
    unit: Literal["g", "ml", "whole"]


class MacroFit(BaseModel):
    calories_target: int = 0
    calories_achieved: int = 0
    calories_delta: int = 0
    protein_target: int = 0
    protein_achieved: int = 0
    protein_delta: int = 0
    carbs_target: int = 0
    carbs_achieved: int = 0
    carbs_delta: int = 0
    fat_target: int = 0
    fat_achieved: int = 0
    fat_delta: int = 0
    match_score_percentage: float = 0.0


class Recipe(BaseModel):
    title: str
    name: str | None = None
    cuisine: str | None = None
    meal_type: str | None = None
    prep_time_mins: int = 0
    ingredients: list[IngredientInput] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    macro_fit: MacroFit = Field(default_factory=MacroFit)

    @model_validator(mode="after")
    def set_name(self) -> "Recipe":
        if not self.name:
            self.name = self.title
        return self


class MealPlan(BaseModel):
    meals: list[Recipe] = Field(default_factory=list)
    total_calories: int = 0
    total_protein: int = 0


class ScraperItem(BaseModel):
    name: str
    store: str
    price: float


class ScraperResults(BaseModel):
    items: list[ScraperItem] = Field(default_factory=list)
    cheapest_store_overall: str | None = None
    total_cost: float = 0.0


class AppState(BaseModel):
    model_config = ConfigDict(validate_assignment=True)

    user_prompt: str | None = None
    cuisine_preference: list[str] = Field(default_factory=list)
    mode: Literal["single_meal", "full_day"] = "single_meal"
    meal_type: str | None = "Lunch"
    target_calories: int = 0
    target_protein: int = 0
    target_carbs: int = 0
    target_fat: int = 0
    ingredients: list[IngredientInput] = Field(default_factory=list)
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
    scraper_results: ScraperResults | None = None
    uploaded_image_name: str | None = None
    input_source: Literal["text", "image", "upload"] = "text"
    cuisine_selected: str | None = None

    def validate_zero_waste(self) -> None:
        inventory = {item.strip().lower() for item in self.available_inventory if item.strip()}
        if not inventory:
            inventory = {item.strip().lower() for item in self.pantry_items if item.strip()}

        recipe = self.generated_recipe or self.recipe
        if recipe is not None:
            actual_ingredients = {ing.name.strip().lower() for ing in recipe.ingredients if ing.name.strip()}
            if inventory and not (actual_ingredients & inventory):
                raise ValueError("generated_recipe must include at least one available inventory item")

            expected_missing = {ing for ing in actual_ingredients if ing not in inventory and ing != "water"}
            reported_missing = {ing.strip().lower() for ing in self.missing_ingredients if ing.strip()}
            recipe_missing = {ing.strip().lower() for ing in recipe.missing_ingredients if ing.strip()}
            if reported_missing != expected_missing or recipe_missing != expected_missing:
                raise ValueError(
                    "generated_recipe.missing_ingredients must exactly reflect recipe ingredients not in available_inventory"
                )
