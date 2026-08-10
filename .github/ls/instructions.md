# Project Name: Autonomous Multimodal Nutrition & Grocery Agent

## Project Overview
This project is an **Autonomous Multimodal Nutrition Agent** built in Python. It solves macro-nutrient constraints, generates meal plans (for a single meal or a full day across diverse cuisines), parses pantry/fridge images, and uses an autonomous browser agent to scrape real-time grocery prices from supermarkets (e.g., Lidl, Aldi) for missing ingredients.

---

## Technical Stack & Dependencies
- **Language:** Python 3.11+
- **Orchestration:** `langgraph` (StateGraph)
- **Vision Model:** `langchain-google-genai` (Gemini 2.5 Flash via Google AI Studio) for fridge image parsing.
- **Recipe & Logic Engine:** `langchain-groq` (Llama 3.3 70B via Groq) for fast macro-constrained recipe generation.
- **Web Automation:** `browser-use` + `playwright` (with Gemini 2.5 Flash) for automated browser interaction on supermarket websites.
- **Data Validation:** `pydantic` v2 (Strict schema enforcement for all LLM outputs).
- **Environment Management:** `python-dotenv`
- **Async Runtime:** `nest-asyncio` for running Playwright and LangGraph loops smoothly.

---

## File Structure & Responsibilities
- `schemas.py`: Contains all Pydantic models (`Recipe`, `MealPlan`, `AppState`).
- `nodes.py`: Houses isolated AI nodes (`vision_node`, `chef_node`, `scraper_node`).
- `main.py`: Compiles the `StateGraph` workflow, connects conditional edges, and executes the runtime event loop.
- `.env`: Stores API keys (`GROQ_API_KEY`, `GOOGLE_API_KEY`).
- `.gitignore`: Excludes `venv/`, `.env`, `__pycache__/`, `.DS_Store`, and `playwright/` artifacts.

---

## Architectural Rules & State Flow
1. **State Persistence:** All nodes MUST accept and return the `AppState` object.
2. **Schema Enforcement:** All LLM calls MUST use `.with_structured_output(PydanticModel)` to prevent unstructured text outputs.
3. **Async Execution:** Since `browser-use` and `playwright` are inherently asynchronous, all nodes interacting with browser automation or API invokers MUST be defined using `async def` and executed with `await`.
4. **Conditional Routing:** If `missing_ingredients` is empty, the graph MUST skip the `scraper_node` and route directly to `END`.

---

## Core Feature Capabilities
1. **Single Meal vs. Full Day Mode:** Supports generating a single high-protein meal or distributing daily calories/protein across Breakfast, Lunch, Dinner, and Snacks.
2. **Multi-Cuisine Support:** Filters recipes by user-selected cuisine preferences (e.g., Mexican, Italian, Mediterranean, Asian, American).
3. **Anti-Boredom Engine:** Penalizes recent protein sources/recipes stored in history to prevent repetitive meals.
4. **Autonomous Grocery Price Extraction:** Uses `browser-use` to navigate to local supermarket sites (Lidl/Aldi), bypass cookie banners, search for missing ingredients, and return total cost estimates in Euros.

---

## Version Control Rules (Git Automation)
1. **Automated Commits:** After creating or modifying files for any major component (e.g., creating schemas, building a node, setting up graph routing), automatically run Git commands to stage, commit, and push.
2. **Commit Conventions:** Follow conventional commit messages:
   - `feat:` for new capabilities or nodes.
   - `fix:` for bug repairs or prompt adjustments.
   - `chore:` for dependency installations and initial setups.
3. **Security Guardrail:** NEVER commit the `.env` file or raw API keys to Git. Ensure `.gitignore` is created before any stage/push command.