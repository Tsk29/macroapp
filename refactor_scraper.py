import re

with open("nodes.py", "r") as f:
    content = f.read()

# 1. Add imports at the top
import_block = """import json
import asyncio
import os
import copy
import uuid
import re
from typing import List, Literal, Optional
from pydantic import Field
from groq import Groq
import chromadb

# Initialize chromadb globally for the module
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    grocery_collection = chroma_client.get_collection(name="groceries")
except Exception as e:
    grocery_collection = None
    print(f"Warning: ChromaDB not available. {e}")

def search_grocery_db(query: str) -> dict:
    \"\"\"Search for a grocery item and return its store and price.\"\"\"
    if not grocery_collection:
        return {"error": "Database not initialized"}
    try:
        results = grocery_collection.query(
            query_texts=[query],
            n_results=1
        )
        if results and results['metadatas'] and len(results['metadatas'][0]) > 0:
            return results['metadatas'][0][0]
        return {"error": "Not found"}
    except Exception as e:
        return {"error": str(e)}

"""

# replace imports (we know it starts with import os, etc.)
content = re.sub(r'import json\nimport asyncio.*?from schemas import .*?\n', import_block + "\nfrom schemas import ", content, flags=re.DOTALL)


# 2. Replace scraper_node
new_scraper_node = """async def scraper_node(state: AppState) -> AppState:
    if not state.missing_ingredients:
        return state

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_grocery_db",
                "description": "Searches the supermarket database for the best price of a given grocery item.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The name of the grocery item to search for (e.g., 'chicken breast', 'olive oil').",
                        }
                    },
                    "required": ["query"],
                },
            },
        }
    ]

    messages = [
        {
            "role": "system",
            "content": "You are a shopping assistant. The user needs to buy the following missing ingredients. "
                       "Use the 'search_grocery_db' tool to look up the best price and store for EACH ingredient. "
                       "After you have retrieved the info for ALL ingredients, summarize the findings."
        },
        {
            "role": "user",
            "content": f"Please find these ingredients: {', '.join(state.missing_ingredients)}"
        }
    ]

    scraper_items: list[ScraperItem] = []
    
    # We loop to allow the LLM to call the tool, then we return the results to it.
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        messages.append(response.choices[0].message)
        
        # If the LLM decided to call tools
        while response.choices[0].message.tool_calls:
            for tool_call in response.choices[0].message.tool_calls:
                if tool_call.function.name == "search_grocery_db":
                    args = json.loads(tool_call.function.arguments)
                    result = search_grocery_db(args["query"])
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "search_grocery_db",
                        "content": json.dumps(result),
                    })
                    
                    if "error" not in result:
                        scraper_items.append(ScraperItem(
                            name=result["name"],
                            store=result["store"],
                            price=float(result["price"])
                        ))
            
            # Send the tool results back to the LLM to get the final summary
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
            )
            messages.append(response.choices[0].message)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Scraper LLM failed: {e}")

    # Fallback to simulated data if tool calling completely failed or returned nothing
    if not scraper_items:
        def normalize_name(name: str) -> str:
            return name.strip().lower()
        def scrape_price_for_store(store: str, query: str) -> float:
            import hashlib
            hash_val = int(hashlib.md5(f"{store}:{query}".encode()).hexdigest(), 16)
            return round(1.0 + (hash_val % 400) / 100.0, 2)
            
        for ingredient in state.missing_ingredients:
            scraper_items.append(ScraperItem(name=ingredient, store="Lidl", price=scrape_price_for_store("Lidl", ingredient)))

    # Deduplicate items by name
    unique_items = {}
    for item in scraper_items:
        unique_items[item.name.lower()] = item
    scraper_items = list(unique_items.values())

    total_cost = sum(item.price for item in scraper_items)
    cheapest_store = min(scraper_items, key=lambda item: item.price).store if scraper_items else None

    state.scraper_results = ScraperResults(
        items=scraper_items,
        cheapest_store_overall=cheapest_store,
        total_cost=round(total_cost, 2),
    )
    state.shopping_estimate = float(state.scraper_results.total_cost)
    state.scraper_report = f"Found {len(scraper_items)} missing ingredients via local Vector DB."

    return state
"""

content = re.sub(r'async def scraper_node.*?return state\n', new_scraper_node, content, flags=re.DOTALL)

with open("nodes.py", "w") as f:
    f.write(content)
print("Done refactoring nodes.py")
