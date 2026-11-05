"""Gemini AI service — handles vision analysis, chat, and TTS.

Runs in DEMO MODE when GEMINI_API_KEY is not configured.
"""
from __future__ import annotations

import base64
import json
import logging
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.config.env import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Demo-mode fixtures
# ---------------------------------------------------------------------------

_DEMO_SAFETY_RESPONSES = [
    {
        "spokenAlert": "Chair detected 1.5 meters ahead at 11 o'clock. Step right.",
        "isPathClear": False,
        "immediateAction": "Step right to avoid chair",
        "hazardSeverity": "medium",
        "detectedObjects": [
            {
                "label": "office chair",
                "clockPosition": "11 o'clock",
                "distanceMeters": 1.5,
                "severity": "medium",
                "box2d": [380, 150, 850, 480],
            }
        ],
        "textReadings": [],
        "currencyDetected": {"present": False},
        "sceneSummary": "Indoor corridor with an office chair partially blocking the path.",
        "safetyNote": "Keep white cane extended 2 feet in front to confirm floor transitions.",
    },
    {
        "spokenAlert": "Path is clear. Proceed straight ahead with caution.",
        "isPathClear": True,
        "immediateAction": "Continue straight",
        "hazardSeverity": "none",
        "detectedObjects": [],
        "textReadings": [],
        "currencyDetected": {"present": False},
        "sceneSummary": "Open corridor, no immediate obstacles detected.",
        "safetyNote": "Remain alert for moving people.",
    },
]

_DEMO_READ_RESPONSES = [
    {
        "spokenAlert": "Sign reads: Exit — 20 metres ahead.",
        "isPathClear": True,
        "immediateAction": "None required",
        "hazardSeverity": "none",
        "detectedObjects": [],
        "textReadings": ["EXIT", "20 METRES"],
        "currencyDetected": {"present": False},
        "sceneSummary": "Directional signboard visible.",
        "safetyNote": "",
    }
]

_DEMO_CURRENCY_RESPONSES = [
    {
        "spokenAlert": "Indian Rupee five hundred note detected.",
        "isPathClear": True,
        "immediateAction": "None required",
        "hazardSeverity": "none",
        "detectedObjects": [],
        "textReadings": [],
        "currencyDetected": {
            "present": True,
            "denomination": "₹500",
            "currency": "INR",
            "series": "Mahatma Gandhi New Series",
            "color": "Stone grey",
        },
        "sceneSummary": "Indian five-hundred rupee note (Mahatma Gandhi series).",
        "safetyNote": "",
    }
]


def _demo_vision(mode: str) -> Dict[str, Any]:
    if mode == "read":
        base = random.choice(_DEMO_READ_RESPONSES)
    elif mode == "currency":
        base = random.choice(_DEMO_CURRENCY_RESPONSES)
    else:
        base = random.choice(_DEMO_SAFETY_RESPONSES)
    result = dict(base)
    result["isDemoMode"] = True
    return result


def _demo_chat(message: str, language: str) -> str:
    replies = [
        "I can see you are in an indoor environment. No immediate hazards are visible.",
        "The area in front of you appears clear. Proceed with normal caution.",
        "I detect a table approximately 2 metres to your right.",
    ]
    return random.choice(replies)


# ---------------------------------------------------------------------------
# Gemini live mode
# ---------------------------------------------------------------------------

def _build_vision_prompt(mode: str, language: str, user_prompt: Optional[str]) -> str:
    lang_map = {
        "hi": "Hindi", "kn": "Kannada", "te": "Telugu", "ta": "Tamil",
        "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati", "ml": "Malayalam",
        "es": "Spanish", "fr": "French", "de": "German",
    }
    lang_name = lang_map.get(language, "English")

    base = (
        f"You are Drishti, an AI assistant for visually impaired users. "
        f"Analyse this image for assistive purposes. Respond ONLY in {lang_name}. "
        f"Return a JSON object with these fields: "
        f"spokenAlert (str, ≤15 words, urgent spoken alert), "
        f"isPathClear (bool), immediateAction (str), "
        f"hazardSeverity (str: none|low|medium|high), "
        f"detectedObjects (list of {{label, clockPosition, distanceMeters, severity, box2d[ymin,xmin,ymax,xmax] 0-1000}}), "
        f"textReadings (list of str), "
        f"currencyDetected (dict with present bool and details if present), "
        f"sceneSummary (str), safetyNote (str). "
    )
    if mode == "read":
        base += "Focus primarily on reading all visible text. "
    elif mode == "currency":
        base += "Focus on identifying banknote denominations and currency. "
    elif mode == "safety":
        base += "Focus on physical hazards and safe navigation. "
    if user_prompt:
        base += f'User question: "{user_prompt}". Answer within spokenAlert if possible.'
    return base


def _call_gemini_vision(image_b64: str, prompt: str) -> Dict[str, Any]:
    """Call Gemini with image. Returns parsed dict or raises."""
    import google.generativeai as genai  # type: ignore

    genai.configure(api_key=config.GEMINI_API_KEY)

    # Try primary then fallback
    for model_name in (config.PRIMARY_MODEL, config.FALLBACK_MODEL):
        try:
            model = genai.GenerativeModel(model_name)
            # Strip data URI prefix if present
            if "," in image_b64:
                image_b64 = image_b64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_b64)
            from google.generativeai.types import content_types  # type: ignore
            part = {"mime_type": "image/jpeg", "data": image_bytes}
            response = model.generate_content([prompt, part])
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except Exception as exc:
            logger.warning("Model %s failed: %s", model_name, exc)

    raise RuntimeError("All Gemini models failed for vision request")


def _call_gemini_chat(
    message: str,
    history: List[Dict[str, str]],
    language: str,
    image_b64: Optional[str],
) -> str:
    import google.generativeai as genai  # type: ignore

    genai.configure(api_key=config.GEMINI_API_KEY)
    lang_map = {"hi": "Hindi", "kn": "Kannada", "te": "Telugu", "ta": "Tamil"}
    lang_name = lang_map.get(language, "English")

    system = (
        f"You are Drishti, an empathetic AI assistant for blind users. "
        f"Respond concisely in {lang_name}. Use spatial descriptions (clock positions, distances). "
        f"Avoid visual clichés. Give actionable guidance."
    )

    for model_name in (config.PRIMARY_MODEL, config.FALLBACK_MODEL):
        try:
            model = genai.GenerativeModel(model_name, system_instruction=system)
            chat_history = [
                {"role": m["role"], "parts": [m["text"]]} for m in history
            ]
            chat = model.start_chat(history=chat_history)
            parts: list = [message]
            if image_b64:
                b64 = image_b64.split(",", 1)[-1]
                parts.append({"mime_type": "image/jpeg", "data": base64.b64decode(b64)})
            response = chat.send_message(parts)
            return response.text.strip()
        except Exception as exc:
            logger.warning("Chat model %s failed: %s", model_name, exc)

    raise RuntimeError("All Gemini models failed for chat request")


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def analyse_vision(
    image: str, mode: str, language: str, user_prompt: Optional[str]
) -> Dict[str, Any]:
    """Return vision analysis dict."""
    if config.is_demo_mode:
        logger.info("Demo mode: returning simulated vision response")
        return _demo_vision(mode)

    prompt = _build_vision_prompt(mode, language, user_prompt)
    try:
        data = _call_gemini_vision(image, prompt)
        data["isDemoMode"] = False
        return data
    except Exception as exc:
        logger.error("Vision analysis failed, using demo fallback: %s", exc)
        return _demo_vision(mode)


def chat(
    message: str,
    history: List[Dict[str, str]],
    language: str,
    image: Optional[str],
) -> str:
    """Return chat reply string."""
    if config.is_demo_mode:
        return _demo_chat(message, language)
    try:
        return _call_gemini_chat(message, history, language, image)
    except Exception as exc:
        logger.error("Chat failed, using demo fallback: %s", exc)
        return _demo_chat(message, language)


def synthesise_tts(text: str, language: str, voice: str) -> Optional[str]:
    """Return base64 audio string or None (client uses browser fallback)."""
    # TTS via Gemini is experimental — for now we signal browser fallback.
    return None

