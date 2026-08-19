import asyncio
import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

system_msg = "You are a JSON-only API. Output ONLY a raw JSON object. No markdown, no explanations."
user_msg = (
    "Create a Mediterranean Lunch recipe using these ingredients: 200g chicken breast, 100g rice.\n"
    "Respond with a JSON object containing exactly these keys:\n"
    '- "title": a creative authentic dish name\n'
    '- "meal_structure": short plating description (e.g. "Main + Side")\n'
    '- "instructions": array of at least 5 highly detailed, step-by-step cooking instructions.\n'
    '- "additional_ingredients": array of extra ingredients YOU MUST add to achieve an authentic Mediterranean flavor profile.\n\n'
)

async def test_model(model):
    print(f"\n--- Testing {model} ---")
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            model=model,
            max_completion_tokens=4000,
            temperature=0.7,
        )
        raw = response.choices[0].message.content or ""
        print(f"RAW OUTPUT LENGTH: {len(raw)}")
        print(f"RAW OUTPUT HEAD: {raw[:200]}")
        print(f"RAW OUTPUT TAIL: {raw[-200:]}")
        
        raw_stripped = raw.strip()
        raw_stripped = re.sub(r'<think>.*?</think>', '', raw_stripped, flags=re.DOTALL).strip()
        raw_stripped = re.sub(r'^```(?:json)?\s*', '', raw_stripped)
        raw_stripped = re.sub(r'\s*```$', '', raw_stripped)
        raw_stripped = raw_stripped.strip()
        
        match = re.search(r'\{.*\}', raw_stripped, re.DOTALL)
        if match:
            print("MATCH FOUND!")
            try:
                parsed = json.loads(match.group(0))
                print(f"SUCCESS! Keys: {list(parsed.keys())}")
            except Exception as e:
                print(f"JSON DECODE ERROR: {e}")
        else:
            print("NO MATCH FOUND. Raw stripped:")
            print(raw_stripped)
    except Exception as e:
        print(f"API ERROR: {e}")

async def main():
    await test_model("openai/gpt-oss-120b")
    await test_model("openai/gpt-oss-20b")
    await test_model("qwen/qwen3.6-27b")

asyncio.run(main())
