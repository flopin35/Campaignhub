from services.orchestrator_service import generate_response, generate_guidance
from services import gemini_service, openai_service
from services.recommendation_service import get_recommendations


async def handle_chat(message: str, context: dict = None, chat_type: str = "assistant") -> dict:
    """Process chat through dual-AI orchestrator."""
    context = context or {}

    if chat_type == "guidance" and context.get("campaign"):
        result = await generate_guidance(context["campaign"], context)
    else:
        result = await generate_response(message, context, chat_type)

    return {
        "reply": result["reply"],
        "type": chat_type,
        "mode": result.get("mode", "unknown"),
        "providers": result.get("providers", []),
        "context": {k: v for k, v in context.items() if k not in ("campaign", "history")},
    }


async def handle_recommendations(campaigns: list, preferences: dict = None) -> dict:
    """Dual-AI recommendations: Gemini ranks, OpenAI personalizes."""
    recommendations = await get_recommendations(campaigns, preferences)
    return {
        "recommendations": recommendations,
        "count": len(recommendations),
        "mode": "collaborative" if len(recommendations) > 0 else "empty",
    }
