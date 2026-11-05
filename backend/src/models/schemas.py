"""Pydantic request / response models for Drishti API."""
from __future__ import annotations
from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Vision Assist
# ---------------------------------------------------------------------------

class VisionRequest(BaseModel):
    image: str = Field(..., description="Base-64 encoded image (data URI)")
    mode: str = Field("safety", description="safety | read | currency | all")
    language: str = Field("en", description="BCP-47 language code")
    userPrompt: Optional[str] = Field(None, description="Optional spoken user question")


class DetectedObject(BaseModel):
    label: str
    clockPosition: str
    distanceMeters: float
    severity: str
    box2d: List[int]


class VisionData(BaseModel):
    spokenAlert: str
    isPathClear: bool
    immediateAction: str
    hazardSeverity: str
    detectedObjects: List[DetectedObject] = []
    textReadings: List[str] = []
    currencyDetected: dict = {}
    sceneSummary: str
    safetyNote: str
    isDemoMode: bool


class VisionResponse(BaseModel):
    success: bool
    timestamp: str
    mode: str
    language: str
    data: VisionData


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    language: str = "en"
    image: Optional[str] = None


class ChatResponse(BaseModel):
    success: bool
    reply: str
    language: str


# ---------------------------------------------------------------------------
# TTS
# ---------------------------------------------------------------------------

class TTSRequest(BaseModel):
    text: str
    language: str = "en"
    voice: str = "female"


class TTSResponse(BaseModel):
    success: bool
    text: str
    language: str
    fallback: bool = True
    audioBase64: Optional[str] = None

