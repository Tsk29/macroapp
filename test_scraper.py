import asyncio
from schemas import AppState
from nodes import scraper_node
from dotenv import load_dotenv

load_dotenv()

async def main():
    state = AppState(
        missing_ingredients=["olive oil", "salt"]
    )
    res = await scraper_node(state)
    print("Cheapest store overall:", res.scraper_results.cheapest_store_overall)
    print("Total cost:", res.scraper_results.total_cost)
    print("Items:")
    for item in res.scraper_results.items:
        print(f" - {item.name}: {item.price} @ {item.store}")

if __name__ == "__main__":
    asyncio.run(main())
