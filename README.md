# 🥗 Autonomous Multimodal Nutrition & Grocery Agent

An intelligent, full-stack nutrition tracking application that leverages Large Language Models (LLMs) and Vision Models to help you reach your daily macro goals. 

Powered by **LangGraph**, the agent intelligently parses your pantry using computer vision, tracks your daily meals, bridges macro gaps, and even generates personalized recipes based on what's available in your kitchen!

## ✨ Features

- 📸 **Pantry Vision Parsing**: Take a photo of your fridge or pantry, and the LLaMA 3.2 Vision model will automatically extract ingredients and estimate their weights in grams.
- 🎯 **Daily Macro Tracking**: Set daily targets for Calories, Protein, Carbs, and Fat. The app intelligently keeps track of your remaining macros throughout the day.
- 🤖 **Agentic Recipe Generation**: Using LangGraph and Groq's fast LLMs, the agent curates realistic recipes based on your cuisine preferences (e.g. Indian, Chinese, Italian) and what ingredients you currently have.
- 🛒 **Automated REWE Grocery Checkout**: The agent tracks missing cultural spices and ingredients across your logged meals and provides a 1-click REWE export at the end of the day.
- 📊 **Daily Diary**: An elegant, persistent sidebar layout that organizes your meals (Breakfast, Lunch, Dinner, Snacks) and tracks your daily progress in real time.
- 💾 **Session & Recipe Management**: Safely create an account to save your profile macros. You can log meals to today's diary, save favorite recipes to your personal cookbook, and instantly regenerate new ideas if you don't like the AI's first suggestion.
- 🌐 **Modern UI/UX**: Built with React, Next.js, and Tailwind CSS, featuring a sleek, dark-themed, glassmorphism dashboard designed for responsiveness and aesthetics.

## 🏗️ Architecture

This project is divided into a robust Python backend and a modern React frontend.

### Backend (Python/FastAPI)
- **`app.py`**: The FastAPI server powering the backend, managing user authentication, logging meals, saving recipes, and exposing API routes to the frontend.
- **`nodes.py`**: The core LLM orchestration using LangGraph. Contains the AI nodes for vision parsing (`vision_node`), recipe generation (`chef_node`), macro calculation, and grocery processing.
- **`schemas.py`**: Pydantic data models for structured inputs/outputs (e.g., `Recipe`, `MealPlan`, `AppState`).
- **`main.py`**: A CLI entry point to test the LangGraph workflow directly in the terminal.

### Frontend (Next.js/React)
- **`frontend/app/page.tsx`**: The main dashboard featuring a comprehensive 3-column layout, the Daily Diary side menubar, macro trackers, and recipe displays.
- **`frontend/app/hooks.ts`**: Contains the `useNutritionAgent` hook that seamlessly connects the React UI to the FastAPI backend.

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js (v18+)
- A [Groq API Key](https://console.groq.com/keys) to power the LLM/Vision generation.

### 1. Set up the Backend

Clone the repository and set up a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set your API keys by creating a `.env` file in the root directory:
```bash
GROQ_API_KEY=your_groq_api_key_here
```

Start the FastAPI server (it runs on port 8001 by default):
```bash
python3 -m uvicorn app:app --host 127.0.0.1 --port 8001 --reload --env-file .env
```

### 2. Set up the Frontend

Open a new terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
```

Start the Next.js development server:
```bash
npm run dev
```

Finally, open your browser and navigate to `http://localhost:3000` to start tracking your nutrition!

## 🔒 Notes
- Keep your API keys local. Do not commit your `.env` file to source control.
- Your data (`users.json`, `daily_logs.json`, and `saved_meals.json`) is stored locally in the root directory and ignored by git.
