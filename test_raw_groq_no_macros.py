import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq()

prompt_no_macros = """You are a Michelin-star chef AND a certified sports nutritionist specialising in Mediterranean.

RULE 1: CUISINE FIDELITY. Strictly follow the flavour profiles and cooking techniques of Mediterranean.
RULE 2: NO-SLOP. Never mix incompatible ingredients into one pot. If the user provides Chicken, Pasta, and Black Beans, cook them separately and plate properly.
RULE 3: ZERO HALLUCINATION. Use the user's ingredients as the foundation. If an ingredient violates Mediterranean, serve it as a disconnected side or adapt it transparently.
RULE 4: REALISTIC BRIDGING. Any added ingredients must fit Mediterranean authentically (e.g., no soy sauce in Italian; use capers or parmesan).
RULE 5: AUTHENTIC SPICING. Name exact spices characteristic of Mediterranean (e.g., "Garam Masala, Turmeric, Cumin" for Indian; "Oregano, Basil" for Italian).

Meal Type: Lunch
Provided Ingredients: 200g chicken breast, 120g rice

Return ONLY a valid JSON object with:
- "title": A creative, highly authentic dish name.
- "meal_structure": A short plating description (e.g. "Main + 2 Sides").
- "instructions": An array of step-by-step instruction strings. Each step must include exact gram weights.
- "additional_ingredients": An array of any extra ingredients used (spices, oils, etc.) not in the provided list."""

try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt_no_macros}],
        model="openai/gpt-oss-120b",
        response_format={"type": "json_object"},
    )
    print("STATUS: SUCCESS")
    print("CONTENT:", response.choices[0].message.content)
except Exception as e:
    print("STATUS: FAILED")
    print("ERROR:", e)
