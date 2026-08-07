from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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


class MealPlan(BaseModel):
    meals: list[Recipe] = Field(default_factory=list)
    total_calories: int = 0
    total_protein: int = 0


class AppState(BaseModel):
    user_prompt: str | None = None
    cuisine_preferences: list[str] = Field(default_factory=list)
    mode: Literal["single_meal", "full_day"] = "single_meal"
    pantry_items: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
    recipe_history: list[str] = Field(default_factory=list)
    meal_plan: MealPlan = Field(default_factory=MealPlan)
    last_generated: datetime | None = None
    recipe: Recipe | None = None
    shopping_estimate: float | None = None
    scraper_report: str | None = None
