from __future__ import annotations

import asyncio
import os
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
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
        {"request": request, "result": None},
    )


@app.post("/submit", response_class=HTMLResponse)
async def submit(
    request: Request,
    user_prompt: str = Form(""),
    upload: UploadFile | None = File(None),
) -> HTMLResponse:
    state = AppState(user_prompt=user_prompt)

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
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "result": final_state,
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
