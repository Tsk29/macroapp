import asyncio
from nodes import generate_recipe_llm
from schemas import IngredientInput
from dotenv import load_dotenv

load_dotenv()

async def main():
    ingredients = [
        IngredientInput(name="chicken breast", amount=200, unit="g"),
        IngredientInput(name="rice", amount=120, unit="g")
    ]
    res = await generate_recipe_llm(
        ingredients, 
        cuisine="Mediterranean", 
        meal_type="Lunch",
        target_calories=500,
        target_protein=40,
        target_carbs=50,
        target_fat=10
    )
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
