import re

with open("nodes.py", "r") as f:
    content = f.read()

# 1. Add generate_recipe_llm before create_realistic_instructions
llm_func = """
async def generate_recipe_llm(ingredients: list[IngredientInput], cuisine: str, meal_type: str) -> dict:
    if not ingredients:
        return {"title": f"{cuisine} {meal_type}", "meal_structure": "Single Plate", "instructions": ["Prep ingredients", "Cook", "Serve"]}
    
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    ingredient_list = ", ".join(f"{i.amount}{i.unit} {i.name}" for i in ingredients)
    
    prompt = f\"\"\"You are a Michelin-star chef specializing in {cuisine}.
You must strictly adhere to the flavor profiles and cooking techniques of {cuisine}. Do not hallucinate fusion dishes unless explicitly asked.

RULE 2: THE "NO-SLOP" MANDATE (SEPARATION OF CONCERNS): NEVER mix incompatible ingredients into a single bowl or pot just because the user provided them. If the user provides Chicken, Pasta, and Black Beans, structure the recipe properly: "Pan-Seared Chicken" (Main) with "Garlic Pasta" (Side 1) and "Spiced Beans" (Side 2). Cook them separately.
RULE 3: ZERO HALLUCINATION & INGREDIENT FILTERING: You must use the user's input ingredients as the foundation. However, if an input ingredient completely violates the {cuisine} profile, you must either serve it as a disconnected side dish OR explicitly state in the description how you creatively adapted it. Do NOT invent new primary proteins or carb bases that the user did not provide.
RULE 4: REALISTIC BRIDGING: If you must add ingredients to hit the target macros, they MUST seamlessly fit the {cuisine}. (e.g., Do not add soy sauce to an Italian dish to hit sodium/flavor targets; use parmesan or capers).

Meal Type: {meal_type}
Provided Ingredients: {ingredient_list}

Return ONLY a valid JSON object with:
- "title": A creative title for the meal.
- "meal_structure": A short string describing plating structure (e.g., "Main + 2 Sides", "Single Bowl").
- "instructions": An array of strings with step-by-step instructions.\"\"\"

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return {"title": f"{cuisine} {meal_type}", "meal_structure": "Single Plate", "instructions": ["Cook ingredients.", "Serve."]}

"""

content = content.replace("def create_realistic_instructions(", llm_func + "\ndef create_realistic_instructions(")

# 2. Update bridge_macro_gaps to async
content = content.replace("def bridge_macro_gaps(state: AppState, recipe: Recipe, inventory: set[str]) -> Recipe:", "async def bridge_macro_gaps(state: AppState, recipe: Recipe, inventory: set[str]) -> Recipe:")

# Inside bridge_macro_gaps
old_line = 'recipe.instructions = create_realistic_instructions(recipe.ingredients, recipe.meal_type or "Lunch")'
new_line = '''
    recipe_dict = await generate_recipe_llm(recipe.ingredients, state.cuisine_preference[0] if state.cuisine_preference else "Custom", recipe.meal_type or "Lunch")
    recipe.title = recipe_dict.get("title", recipe.title)
    recipe.meal_structure = recipe_dict.get("meal_structure")
    recipe.instructions = recipe_dict.get("instructions", [])
'''
content = content.replace(old_line, new_line)

# 3. Update split_full_day_plan to async
content = content.replace("def split_full_day_plan(state: AppState, base_recipe: Recipe, missing: list[str]) -> tuple[list[Recipe], list[str]]:", "async def split_full_day_plan(state: AppState, base_recipe: Recipe, missing: list[str]) -> tuple[list[Recipe], list[str]]:")

# Update split_full_day_plan to await the new function instead of calling create_realistic_instructions synchronously
# Breakfast
content = re.sub(r'instructions=create_realistic_instructions\(([^,]+),\s*"Breakfast"\),', 'instructions=(await generate_recipe_llm(\\1, base_recipe.cuisine or "Custom", "Breakfast")).get("instructions", []),', content)
# Lunch
content = re.sub(r'instructions=create_realistic_instructions\(([^,]+),\s*"Lunch"\),', 'instructions=(await generate_recipe_llm(\\1, base_recipe.cuisine or "Custom", "Lunch")).get("instructions", []),', content)
# Dinner
content = re.sub(r'instructions=create_realistic_instructions\(([^,]+),\s*"Dinner"\),', 'instructions=(await generate_recipe_llm(\\1, base_recipe.cuisine or "Custom", "Dinner")).get("instructions", []),', content)
# Snack
content = re.sub(r'instructions=create_realistic_instructions\(([^,]+),\s*"Snack"\),', 'instructions=(await generate_recipe_llm(\\1, base_recipe.cuisine or "Custom", "Snack")).get("instructions", []),', content)

# 4. Update custom_recipe creation in chef_node
old_custom = 'instructions=create_realistic_instructions(state.ingredients, state.meal_type or "Lunch"),'
new_custom = 'instructions=(await generate_recipe_llm(state.ingredients, state.cuisine_preference[0] if state.cuisine_preference else "Custom", state.meal_type or "Lunch")).get("instructions", []),'
content = content.replace(old_custom, new_custom)

# 5. Update await calls in chef_node
content = content.replace("custom_recipe = bridge_macro_gaps(state, custom_recipe, inventory)", "custom_recipe = await bridge_macro_gaps(state, custom_recipe, inventory)")
content = content.replace("base_recipe = bridge_macro_gaps(state, base_recipe, inventory)", "base_recipe = await bridge_macro_gaps(state, base_recipe, inventory)")
content = content.replace("meals, daily_missing = split_full_day_plan(state, custom_recipe, custom_recipe.missing_ingredients)", "meals, daily_missing = await split_full_day_plan(state, custom_recipe, custom_recipe.missing_ingredients)")
content = content.replace("meals, daily_missing = split_full_day_plan(state, base_recipe, base_recipe.missing_ingredients)", "meals, daily_missing = await split_full_day_plan(state, base_recipe, base_recipe.missing_ingredients)")

with open("nodes.py", "w") as f:
    f.write(content)
