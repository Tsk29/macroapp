# Autonomous Multimodal Nutrition & Grocery Agent

A Python-based nutrition agent that combines recipe generation, pantry vision parsing, and grocery price scraping via a LangGraph workflow.

## Overview

- `schemas.py`: Pydantic models for `Recipe`, `MealPlan`, and `AppState`.
- `nodes.py`: Mock AI nodes for vision, recipe generation, and grocery scraping.
- `main.py`: Basic workflow orchestration with a `StateGraph`-style execution path.
- `.gitignore`: Excludes environment files, caches, and local artifacts.

## Installation

Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

Run the command-line workflow:

```bash
python main.py
```

Run the web app locally:

```bash
uvicorn app:app --reload
```

Open `http://127.0.0.1:8000` in your browser.

## Notes

- Keep API keys in a local `.env` file.
- Do not commit `.env` to source control.
