from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.assistant_service import handle_chat, handle_recommendations
from services import gemini_service, openai_service

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = {}
    type: Optional[str] = "assistant"


class RecommendationRequest(BaseModel):
    campaigns: list = []
    preferences: Optional[dict] = {}


@router.post("/chat")
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = await handle_chat(
        message=request.message,
        context=request.context,
        chat_type=request.type,
    )
    return result


@router.post("/recommendations")
async def recommendations(request: RecommendationRequest):
    result = await handle_recommendations(
        campaigns=request.campaigns,
        preferences=request.preferences,
    )
    return result


@router.get("/status")
async def ai_status():
    """Health check showing both AI providers."""
    return {
        "mode": "split",
        "gemini": {"configured": gemini_service.is_configured(), "role": "presentation & content"},
        "openai": {"configured": openai_service.is_configured(), "role": "dashboard & analytics"},
        "split_routing": True,
    }
