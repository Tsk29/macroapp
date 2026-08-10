from __future__ import annotations

import uuid
from pathlib import Path
from typing import List, Optional, Literal

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from main import run_workflow
from schemas import AppState


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Nutrition Agent Web UI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


class SubmitPayload(BaseModel):
    user_prompt: str | None = None
    mode: Literal["single_meal", "full_day"] = "single_meal"
    meal_type: str | None = "Lunch"
    cuisine_preferences: list[str] = Field(default_factory=list)


@app.get("/", response_class=HTMLResponse)
async def homepage(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "result": None,
            "mode": "single_meal",
            "meal_type": "Lunch",
            "user_prompt": "",
            "selected_recipe": None,
            "cuisine_preferences": [],
        },
    )


@app.post("/api/submit", response_model=AppState)
async def submit_api(payload: SubmitPayload) -> AppState:
    state = AppState(
        user_prompt=payload.user_prompt,
        mode=payload.mode,
        meal_type=payload.meal_type,
        cuisine_preferences=payload.cuisine_preferences,
    )
    final_state = await run_workflow(state)
    return final_state


@app.post("/submit", response_class=HTMLResponse)
async def submit(
    request: Request,
    user_prompt: str = Form(""),
    mode: str = Form("single_meal"),
    meal_type: str = Form("Lunch"),
    cuisine_preferences: List[str] = Form([]),
    selected_recipe: str = Form(""),
    upload: UploadFile | None = File(None),
) -> HTMLResponse:
    state = AppState(
        user_prompt=user_prompt,
        mode=mode,
        meal_type=meal_type,
        cuisine_preferences=cuisine_preferences,
    )

    if upload is not None and upload.filename:
        file_extension = Path(upload.filename).suffix.lower()
        if file_extension not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise HTTPException(status_code=400, detail="Unsupported image format.")
        image_name = f"{uuid.uuid4()}{file_extension}"
        image_path = UPLOAD_DIR / image_name
        with image_path.open("wb") as buffer:
            buffer.write(await upload.read())
        state.uploaded_image_name = image_name

    final_state = await run_workflow(state)

    if selected_recipe.strip() and final_state.suggested_recipes:
        try:
            index = int(selected_recipe)
            if 0 <= index < len(final_state.suggested_recipes):
                choice = final_state.suggested_recipes[index]
                final_state.recipe = choice
                final_state.generated_recipe = choice
                final_state.display_recipe = choice
                final_state.meal_plan = final_state.meal_plan.copy(update={
                    "meals": [choice],
                    "total_calories": choice.calories,
                    "total_protein": choice.protein_grams,
                })
        except ValueError:
            pass

    if final_state.display_recipe is None and final_state.generated_recipe is not None:
        final_state.display_recipe = final_state.generated_recipe

    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "result": final_state,
            "mode": mode,
            "meal_type": meal_type,
            "user_prompt": user_prompt,
            "selected_recipe": selected_recipe,
            "cuisine_preferences": cuisine_preferences,
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
