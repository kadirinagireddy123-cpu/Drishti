"""FastAPI application factory for Drishti backend."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.env import config
from src.routes.api import router

app = FastAPI(
    title="Drishti: Voice & Vision AI Backend",
    description=(
        "Assistive AI backend for visually impaired users. "
        "Powered by Google Gemini multimodal models."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
origins = (
    ["*"]
    if config.CORS_ORIGIN == "*"
    else [o.strip() for o in config.CORS_ORIGIN.split(",")]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "Drishti Voice & Vision AI Backend",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }

