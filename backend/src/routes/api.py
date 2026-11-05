"""Vision, Chat, TTS, and utility routes for Drishti."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from src.models.schemas import (
    ChatRequest, ChatResponse,
    TTSRequest, TTSResponse,
    VisionRequest, VisionResponse,
)
from src.services import gemini as gemini_svc
from src.config.env import config

router = APIRouter()

# ---------------------------------------------------------------------------
# Supported languages
# ---------------------------------------------------------------------------
LANGUAGES = [
    {"code": "en", "name": "English", "native": "English"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
    {"code": "mr", "name": "Marathi", "native": "मराठी"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
    {"code": "es", "name": "Spanish", "native": "Español"},
    {"code": "fr", "name": "French", "native": "Français"},
    {"code": "de", "name": "German", "native": "Deutsch"},
]

MODES = [
    {"id": "safety", "label": "Safety Navigation", "description": "Obstacle and hazard detection"},
    {"id": "read", "label": "Text Reading", "description": "OCR and sign reading"},
    {"id": "currency", "label": "Currency Detection", "description": "Banknote recognition"},
    {"id": "all", "label": "All Modes", "description": "Combined analysis"},
]


# ---------------------------------------------------------------------------
# Vision assist
# ---------------------------------------------------------------------------

@router.post("/vision-assist")
@router.post("/api/vision-assist")
async def vision_assist(req: VisionRequest) -> JSONResponse:
    if not req.image:
        raise HTTPException(status_code=400, detail="image field is required")

    data = gemini_svc.analyse_vision(req.image, req.mode, req.language, req.userPrompt)
    return JSONResponse({
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": req.mode,
        "language": req.language,
        "data": data,
    })


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@router.post("/chat")
@router.post("/api/chat")
async def chat_endpoint(req: ChatRequest) -> JSONResponse:
    history = [m.model_dump() for m in req.history]
    reply = gemini_svc.chat(req.message, history, req.language, req.image)
    return JSONResponse({"success": True, "reply": reply, "language": req.language})


# ---------------------------------------------------------------------------
# TTS
# ---------------------------------------------------------------------------

@router.post("/tts")
@router.post("/api/tts")
async def tts_endpoint(req: TTSRequest) -> JSONResponse:
    audio = gemini_svc.synthesise_tts(req.text, req.language, req.voice)
    return JSONResponse({
        "success": True,
        "text": req.text,
        "language": req.language,
        "fallback": audio is None,
        "audioBase64": audio,
    })


# ---------------------------------------------------------------------------
# Health / meta
# ---------------------------------------------------------------------------

@router.get("/health")
@router.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({
        "status": "ok",
        "demoMode": config.is_demo_mode,
        "primaryModel": config.PRIMARY_MODEL,
        "fallbackModel": config.FALLBACK_MODEL,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/languages")
@router.get("/api/languages")
async def languages() -> JSONResponse:
    return JSONResponse({"success": True, "languages": LANGUAGES})


@router.get("/modes")
@router.get("/api/modes")
async def modes() -> JSONResponse:
    return JSONResponse({"success": True, "modes": MODES})

