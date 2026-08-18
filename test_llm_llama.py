import asyncio
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = Groq()
    prompt = "Hello"
    try:
        res = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
        )
        print("llama3-70b-8192 works")
    except Exception as e:
        print(e)
    try:
        res = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-70b-versatile",
        )
        print("llama-3.1-70b-versatile works")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    asyncio.run(main())
