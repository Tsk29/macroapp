import os
import time
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq()

prompt = """You are a food scanner. Return a JSON object with:
- "items": an array of items, each with "name" and "price".

Start your response with '{' and end with '}'."""

for model in ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
    print(f"Testing model: {model}")
    start = time.time()
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            response_format={"type": "json_object"},
        )
        print("STATUS: SUCCESS")
        print("TIME: ", time.time() - start)
        print("CONTENT:", response.choices[0].message.content)
    except Exception as e:
        print("STATUS: FAILED")
        print("ERROR:", e)
    print()
