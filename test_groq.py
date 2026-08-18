from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()
client = Groq()
models = client.models.list()
for m in models.data:
    if "llama" in m.id:
        print(m.id)
