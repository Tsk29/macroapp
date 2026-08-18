import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq()

prompt = """You are a Michelin-star chef AND a certified sports nutritionist specialising in Mediterranean.

RULE 1: CUISINE FIDELITY. Strictly follow the flavour profiles and cooking techniques of Mediterranean.
RULE 2: NO-SLOP. Never mix incompatible ingredients into one pot. If the user provides Chicken, Pasta, and Black Beans, cook them separately and plate properly.
RULE 3: ZERO HALLUCINATION. Use the user's ingredients as the foundation. If an ingredient violates Mediterranean, serve it as a disconnected side or adapt it transparently.
RULE 4: REALISTIC BRIDGING. Any added ingredients must fit Mediterranean authentically (e.g., no soy sauce in Italian; use capers or parmesan).
RULE 5: AUTHENTIC SPICING. Name exact spices characteristic of Mediterranean (e.g., "Garam Masala, Turmeric, Cumin" for Indian; "Oregano, Basil" for Italian).

TARGET MACROS — you MUST hit these numbers with your portion choices:
  • Calories : 500 kcal
  • Protein  : 40 g
  • Carbs    : 50 g
  • Fat      : 10 g

CRITICAL MACRO RULES:
- Adjust gram weights of ingredients so the TOTAL meal hits the target macros.
- Always state exact gram amounts (e.g. "180g chicken breast", "90g brown rice cooked").
- If the base ingredients cannot reach the protein target alone, add a complementary
  protein source that fits the Mediterranean cuisine (e.g. Greek yoghurt for Mediterranean,
  paneer for Indian, tofu for Asian).
- Do NOT exceed the calorie target by more than 10%.

Meal Type: Lunch
Provided Ingredients: 200g chicken breast, 120g rice

You must return ONLY a JSON object. Do not output any thinking process, explanations, markdown formatting, or introductory/concluding remarks.
The JSON object must contain exactly the following keys:
- "title": A creative, highly authentic dish name.
- "meal_structure": A short plating description (e.g. "Main + 2 Sides").
- "instructions": An array of step-by-step instruction strings. Each step must include exact gram weights.
- "additional_ingredients": An array of any extra ingredients used (spices, oils, etc.) not in the provided list.

Start your response with '{' and end with '}'."""

print("--- Testing qwen/qwen3.6-27b WITH JSON mode ---")
try:
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="qwen/qwen3.6-27b",
        response_format={"type": "json_object"},
    )
    print("STATUS: SUCCESS")
    print("CONTENT:", response.choices[0].message.content)
except Exception as e:
    print("STATUS: FAILED")
    print("ERROR:", e)
