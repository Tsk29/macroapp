import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = Groq()
    prompt = """You are a Michelin-star chef AND a certified sports nutritionist specialising in Mediterranean.

RULE 1: CUISINE FIDELITY. Strictly follow the flavour profiles and cooking techniques of Mediterranean.
RULE 2: NO-SLOP. Never mix incompatible ingredients into one pot. If the user provides Chicken, Pasta, and Black Beans, cook them separately and plate properly.
RULE 3: ZERO HALLUCINATION. Use the user's ingredients as the foundation. If an ingredient violates Mediterranean, serve it as a disconnected side or adapt it transparently.
RULE 4: REALISTIC BRIDGING. Any added ingredients must fit Mediterranean authentically (e.g., no soy sauce in Italian; use capers or parmesan).
RULE 5: AUTHENTIC SPICING. Name exact spices characteristic of Mediterranean (e.g., "Garam Masala, Turmeric, Cumin" for Indian; "Oregano, Basil" for Italian).

TARGET MACROS — you MUST hit these numbers with your portion choices:
  • Calories : 500 kcal
  • Protein  : 50 g
  • Carbs    : 50 g
  • Fat      : 15 g

CRITICAL MACRO RULES:
- Adjust gram weights of ingredients so the TOTAL meal hits the target macros.
- Always state exact gram amounts (e.g. "180g chicken breast", "90g brown rice cooked").
- If the base ingredients cannot reach the protein target alone, add a complementary
  protein source that fits the Mediterranean cuisine (e.g. Greek yoghurt for Mediterranean,
  paneer for Indian, tofu for Asian).
- Do NOT exceed the calorie target by more than 10%.

Meal Type: Lunch
Provided Ingredients: 200g chicken breast, 100g rice

Return ONLY a valid JSON object with:
- "title": A creative, highly authentic dish name.
- "meal_structure": A short plating description (e.g. "Main + 2 Sides").
- "instructions": An array of step-by-step instruction strings. Each step must include exact gram weights.
- "additional_ingredients": An array of any extra ingredients used (spices, oils, etc.) not in the provided list.
"""
    res = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="openai/gpt-oss-120b",
    )
    print("GPT-OSS-120B Output:")
    print(repr(res.choices[0].message.content))

    res2 = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="qwen/qwen3.6-27b",
    )
    print("QWEN Output:")
    print(repr(res2.choices[0].message.content))

if __name__ == "__main__":
    asyncio.run(main())
