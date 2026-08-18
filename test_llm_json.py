import re
import json
import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = Groq()
    prompt = """You are a Michelin-star chef AND a certified sports nutritionist specialising in Mediterranean.

Meal Type: Lunch
Provided Ingredients: 200g chicken breast, 100g rice

Return ONLY a valid JSON object with:
- "title": A creative, highly authentic dish name.
- "instructions": An array of step-by-step instruction strings. Each step must include exact gram weights.

CRITICAL: Do NOT wrap your output in markdown. Output RAW JSON text.
"""
    res = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="openai/gpt-oss-120b",
    )
    text = res.choices[0].message.content
    print("Raw output:", repr(text))
    
    # Try parsing
    try:
        # Regex to find JSON block if it's wrapped
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            text = match.group(0)
        print(json.loads(text))
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
