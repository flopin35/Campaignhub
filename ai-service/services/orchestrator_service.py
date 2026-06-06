import asyncio
from typing import Optional
from services import gemini_service, openai_service
from services.local_fallback_service import generate_local_response

# Keywords that benefit from dual-AI collaboration (creative / strategic)
COMPLEX_KEYWORDS = {
    "recommend", "suggest", "help me", "strategy", "improve", "creative",
    "write", "ideas", "best", "optimize", "grow", "promote", "audience",
    "banner", "tips", "advice", "how can", "what should", "title", "slogan",
    "description",
}


def _fallback_response(message: str, context: dict = None) -> str:
    return generate_local_response(message, context or {})


def _needs_collaboration(message: str, chat_type: str) -> bool:
    """Decide if both AIs should collaborate or a single fast response suffices."""
    if chat_type in ("guidance", "recommendations"):
        return True
    msg = message.lower()
    return any(kw in msg for kw in COMPLEX_KEYWORDS) or len(message.split()) > 12


async def _safe_call(coro, label: str) -> Optional[str]:
    try:
        return await asyncio.wait_for(coro, timeout=25.0)
    except asyncio.TimeoutError:
        print(f"{label} timed out")
        return None
    except Exception as e:
        print(f"{label} error: {e}")
        return None


async def generate_response(
    message: str,
    context: dict = None,
    chat_type: str = "assistant",
) -> dict:
    """
    Dual-AI orchestrator.
    - Simple queries → Gemini fast path (with OpenAI fallback)
    - Complex / guidance → Both AIs in parallel → synthesized response
    """
    context = context or {}
    gemini_ok = gemini_service.is_configured()
    openai_ok = openai_service.is_configured()

    if not gemini_ok and not openai_ok:
        return {
            "reply": _fallback_response(message, context),
            "mode": "fallback",
            "providers": [],
        }

    collaborate = _needs_collaboration(message, chat_type)

    # ── Fast path: single provider ──
    if not collaborate:
        if gemini_ok:
            reply = await _safe_call(gemini_service.chat(message, context), "Gemini")
            if reply:
                return {"reply": reply, "mode": "gemini", "providers": ["gemini"]}
        if openai_ok:
            reply = await _safe_call(openai_service.chat(message, context), "OpenAI")
            if reply:
                return {"reply": reply, "mode": "openai", "providers": ["openai"]}
        return {"reply": _fallback_response(message, context), "mode": "fallback", "providers": []}

    # ── Collaborative path: both AIs in parallel ──
    tasks = []
    labels = []

    if gemini_ok:
        tasks.append(_safe_call(gemini_service.chat(message, context), "Gemini"))
        labels.append("gemini")
    if openai_ok:
        tasks.append(_safe_call(openai_service.chat(message, context), "OpenAI"))
        labels.append("openai")

    results = await asyncio.gather(*tasks)
    responses = dict(zip(labels, results))

    gemini_text = responses.get("gemini")
    openai_text = responses.get("openai")

    # Both succeeded → synthesize into one smooth answer
    if gemini_text and openai_text:
        if openai_ok:
            merged = await _safe_call(
                openai_service.synthesize(gemini_text, openai_text, message),
                "OpenAI synthesizer",
            )
        else:
            merged = await _safe_call(
                gemini_service.synthesize(gemini_text, openai_text, message),
                "Gemini synthesizer",
            )
        reply = merged or openai_text or gemini_text
        return {"reply": reply, "mode": "collaborative", "providers": ["gemini", "openai"]}

    # One succeeded → use it directly
    reply = openai_text or gemini_text or _fallback_response(message, context)
    provider = "openai" if openai_text else "gemini" if gemini_text else "fallback"
    return {
        "reply": reply,
        "mode": provider,
        "providers": [provider] if provider != "fallback" else [],
    }


async def generate_guidance(campaign: dict, context: dict = None) -> dict:
    """
    Dual-AI campaign guidance:
    Gemini → quick platform tips | OpenAI → strategic growth advice → merged
    """
    context = context or {}
    context["campaignTitle"] = campaign.get("title", "")

    gemini_prompt = (
        f"Give 3 quick platform tips for promoting the campaign '{campaign.get('title')}'. "
        "Focus on link sharing, QR codes, and CampaignHub features. Bullet format."
    )
    openai_prompt = (
        f"Give strategic growth advice for campaign '{campaign.get('title')}': "
        f"{campaign.get('description', '')[:200]}"
    )

    gemini_task = _safe_call(gemini_service.chat(gemini_prompt, context), "Gemini guidance")
    openai_task = _safe_call(openai_service.generate_guidance(campaign), "OpenAI guidance")

    gemini_text, openai_text = await asyncio.gather(gemini_task, openai_task)

    if gemini_text and openai_text and openai_service.is_configured():
        merged = await _safe_call(
            openai_service.synthesize(
                gemini_text, openai_text, f"Campaign guidance for {campaign.get('title')}"
            ),
            "Guidance synthesizer",
        )
        reply = merged or f"{gemini_text}\n\n{openai_text}"
        return {"reply": reply, "mode": "collaborative", "providers": ["gemini", "openai"]}

    reply = openai_text or gemini_text or "Share your campaign link and QR code to reach more people."
    return {"reply": reply, "mode": "single", "providers": ["openai" if openai_text else "gemini"]}
