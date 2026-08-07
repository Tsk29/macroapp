from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from main import run_workflow
from schemas import AppState


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Nutrition Agent Web UI")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/", response_class=HTMLResponse)
async def homepage(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "result": None, "mode": "single_meal", "user_prompt": "", "selected_recipe": None},
    )


@app.post("/submit", response_class=HTMLResponse)
async def submit(
    request: Request,
    user_prompt: str = Form(""),
    mode: str = Form("single_meal"),
    selected_recipe: str = Form(""),
    upload: UploadFile | None = File(None),
) -> HTMLResponse:
    state = AppState(user_prompt=user_prompt, mode=mode)

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
                final_state.meal_plan = final_state.meal_plan.copy(update={
                    "meals": [choice],
                    "total_calories": choice.calories,
                    "total_protein": choice.protein_grams,
                })
        except ValueError:
            pass

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "result": final_state,
            "mode": mode,
            "user_prompt": user_prompt,
            "selected_recipe": selected_recipe,
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
