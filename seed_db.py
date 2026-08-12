import chromadb

def seed():
    # Initialize a local ChromaDB instance in a directory named 'chroma_db'
    client = chromadb.PersistentClient(path="./chroma_db")
    
    # Create or get a collection for grocery items
    collection = client.get_or_create_collection(name="groceries")

    # Sample supermarket catalog
    groceries = [
        {"id": "g1", "name": "Chicken Breast", "store": "Aldi Süd", "price": 4.99},
        {"id": "g2", "name": "Chicken Thighs", "store": "Lidl", "price": 3.49},
        {"id": "g3", "name": "Brown Rice", "store": "Netto", "price": 1.29},
        {"id": "g4", "name": "Spaghetti Pasta", "store": "Aldi Süd", "price": 0.89},
        {"id": "g5", "name": "Extra Virgin Olive Oil", "store": "Lidl", "price": 5.99},
        {"id": "g6", "name": "Black Beans", "store": "Netto", "price": 0.99},
        {"id": "g7", "name": "Avocado", "store": "Lidl", "price": 1.19},
        {"id": "g8", "name": "Quinoa", "store": "Aldi Süd", "price": 2.49},
        {"id": "g9", "name": "Large Eggs (12 pk)", "store": "Netto", "price": 2.19},
        {"id": "g10", "name": "Sea Salt", "store": "Lidl", "price": 0.59},
        {"id": "g11", "name": "Ground Beef (500g)", "store": "Aldi Süd", "price": 4.50},
        {"id": "g12", "name": "Broccoli", "store": "Lidl", "price": 1.09},
        {"id": "g13", "name": "Whole Milk (1L)", "store": "Netto", "price": 1.05},
        {"id": "g14", "name": "Butter", "store": "Aldi Süd", "price": 1.69},
        {"id": "g15", "name": "Tomatoes (500g)", "store": "Lidl", "price": 1.49},
        {"id": "g16", "name": "Spinach", "store": "Aldi Süd", "price": 1.29},
        {"id": "g17", "name": "Garlic (3 pk)", "store": "Netto", "price": 0.89},
        {"id": "g18", "name": "Onions (1kg)", "store": "Lidl", "price": 1.19},
        {"id": "g19", "name": "Cheddar Cheese", "store": "Aldi Süd", "price": 2.59},
        {"id": "g20", "name": "Bread (Whole Wheat)", "store": "Netto", "price": 1.39},
    ]

    ids = [item["id"] for item in groceries]
    documents = [f"{item['name']} - {item['store']} - €{item['price']}" for item in groceries]
    metadatas = [{"name": item["name"], "store": item["store"], "price": item["price"]} for item in groceries]

    # Add items to the vector database
    # Upsert avoids duplicating if we run it multiple times
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )
    print(f"Successfully seeded {len(groceries)} items into ChromaDB.")

if __name__ == "__main__":
    seed()
