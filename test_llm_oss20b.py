import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = Groq()
    prompt = """You are a Michelin-star chef AND a certified sports nutritionist specialising in Mediterranean.

TARGET MACROS — you MUST hit these numbers with your portion choices:
  • Calories : 500 kcal
  • Protein  : 50 g
  • Carbs    : 50 g
  • Fat      : 15 g

Meal Type: Lunch
Provided Ingredients: 200g chicken breast, 100g rice

Return ONLY a valid JSON object with:
- "title": A creative, highly authentic dish name.
- "instructions": An array of step-by-step instruction strings. Each step must include exact gram weights.
"""
    try:
        res = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-20b",
        )
        print("GPT-OSS-20B Output:")
        print(repr(res.choices[0].message.content))
    except Exception as e:
        print(e)

if __name__ == "__main__":
    asyncio.run(main())
