import os
import re
import random
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-flash-lite-latest")

SYSTEM_PROMPT = """You are CampaignHub Gemini — specialist in campaign presentation and marketing content for Ghana.

Your role: GENERATE and POLISH campaign content.
- Catchy titles, slogans, captions, hashtags, CTAs
- WhatsApp, Facebook, Instagram, TikTok post formats
- Short compelling descriptions and share copy
- Banner/poster messaging ideas

Platform context (brief only when asked):
- Free campaigns on CampaignHub; premium boosts visibility
- Telecel Cash payments with CH- reference codes
- Share via link, QR code, WhatsApp

Write ready-to-use copy. Be creative, concise, and professional. Match the user's category and audience."""


def is_configured() -> bool:
    return bool(GEMINI_API_KEY)


def _build_context(context: dict, chat_type: str = '') -> str:
    parts = []
    if context.get("campaignTitle"):
        parts.append(f"Viewing campaign: {context['campaignTitle']}")
    if context.get("page"):
        parts.append(f"Current page: {context['page']}")
    if context.get("category"):
        parts.append(f"Category: {context['category']}")
    if context.get("platform"):
        parts.append(f"Target platform: {context['platform']}")
    if context.get("type"):
        parts.append(f"Content type: {context['type']}")
    if chat_type:
        parts.append(f"Task: {chat_type}")
    return "\n".join(parts)


async def chat(message: str, context: dict = None, chat_type: str = "presentation") -> str:
    """Gemini — presentation & content generation."""
    context = context or {}

    if not is_configured():
        raise RuntimeError("Gemini API key not configured")

    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    context_str = _build_context(context, chat_type)
    prompt = f"{SYSTEM_PROMPT}\n{context_str}\n\nUser: {message}\n\nAssistant:"

    models = [
        GEMINI_MODEL,
        GEMINI_FALLBACK_MODEL,
        "gemini-flash-lite-latest",
        "gemini-2.0-flash-lite",
    ]

    last_error = None
    for model_name in dict.fromkeys(models):
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = (response.text or "").strip()
            if text:
                return text
        except Exception as e:
            last_error = e
            err = str(e).lower()
            print(f"Gemini ({model_name}) error: {e}")
            # Quota/rate limit — try next lighter model
            if "429" in err or "quota" in err or "404" in err:
                continue
            continue

    raise RuntimeError(f"All Gemini models failed: {last_error}")


async def rank_campaigns(campaigns: list, preferences: dict = None) -> list:
    """Use Gemini to score and rank campaigns by relevance."""
    if not campaigns or not is_configured():
        return campaigns

    preferences = preferences or {}
    limit = preferences.get("limit", 3)
    category = preferences.get("category", "general interest")

    campaign_list = "\n".join(
        f"- ID:{c.get('id','?')} | {c.get('title','')} | {c.get('description','')[:120]}"
        for c in campaigns[:10]
    )

    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_FALLBACK_MODEL or GEMINI_MODEL)

    prompt = f"""Rank these campaigns for a user interested in "{category}".
Return ONLY a comma-separated list of campaign IDs in best-match order (top {limit}).
No explanation.

Campaigns:
{campaign_list}"""

    try:
        response = model.generate_content(prompt)
        ids = [s.strip() for s in response.text.replace("\n", ",").split(",") if s.strip()]
        id_order = {cid: i for i, cid in enumerate(ids)}

        ranked = sorted(
            campaigns,
            key=lambda c: id_order.get(str(c.get("id", "")), 999),
        )
        return ranked[:limit]
    except Exception as e:
        print(f"Gemini ranking error: {e}")
        return campaigns[:limit]


async def synthesize(gemini_text: str, openai_text: str, original_message: str) -> str:
    """Gemini fallback synthesizer when OpenAI unavailable."""
    if not is_configured():
        return openai_text or gemini_text

    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_FALLBACK_MODEL or GEMINI_MODEL)

    prompt = f"""Merge these two AI responses into ONE polished, concise answer for the user.
Keep the best parts of each. No mention of multiple AIs. Friendly and professional.

User asked: {original_message}

Response A: {gemini_text}

Response B: {openai_text}

Merged answer:"""

    response = model.generate_content(prompt)
    return response.text.strip()
