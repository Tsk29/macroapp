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
    res = await generate_recipe_llm(ingredients, "Mediterranean", "Lunch")
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
