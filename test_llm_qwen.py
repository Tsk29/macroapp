import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = Groq()
    prompt = "You are a chef. Output a valid JSON object with 'title', 'instructions' as array of strings. Ingredients: chicken."
    res = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="qwen/qwen3.6-27b",
        response_format={"type": "json_object"},
    )
    print(res.choices[0].message.content)

if __name__ == "__main__":
    asyncio.run(main())
