import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are CampaignHub Dashboard AI — specialist in campaign management, analytics, and business operations.

Your role: HELP USERS MANAGE campaigns on their dashboard.
- Interpret analytics (views, shares, QR scans, engagement)
- Suggest improvements based on performance data
- Explain campaign statuses and next steps
- Guide premium upgrades when relevant (boosts, verification, analytics)
- Admin-style operational advice for active campaigns

Platform facts:
- Status flow: payment_pending → pending_review → active → expired
- Free tier includes basic analytics; advanced analytics is premium
- Telecel Cash payments with unique CH- reference codes
- Public URLs: /campaign/{slug}

Be practical, data-minded, and concise. Focus on actions the user can take today."""


def is_configured() -> bool:
    return bool(OPENAI_API_KEY)


def _build_messages(message: str, context: dict, chat_type: str = 'dashboard') -> list:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    context_parts = [f"Task type: {chat_type}"]
    if context.get("campaignTitle"):
        context_parts.append(f"Campaign: {context['campaignTitle']}")
    if context.get("page"):
        context_parts.append(f"Current page: {context['page']}")
    if context.get("category"):
        context_parts.append(f"Category: {context['category']}")
    if context.get("stats"):
        context_parts.append(f"Analytics snapshot: {context['stats']}")

    if context.get("history"):
        for turn in context["history"][-4:]:
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages[0]["content"] += "\n\n" + "\n".join(context_parts)
    messages.append({"role": "user", "content": message})
    return messages


async def chat(message: str, context: dict = None, chat_type: str = "dashboard") -> str:
    """OpenAI — dashboard management & analytics."""
    context = context or {}

    if not is_configured():
        raise RuntimeError("OpenAI API key not configured")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=_build_messages(message, context, chat_type),
        max_tokens=500,
        temperature=0.6,
    )
    return response.choices[0].message.content.strip()


async def synthesize(gemini_text: str, openai_text: str, original_message: str) -> str:
    """Legacy merge helper — kept for compatibility."""
    if not is_configured():
        return openai_text or gemini_text

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "Merge two expert responses into one concise CampaignHub answer.",
            },
            {
                "role": "user",
                "content": f"Question: {original_message}\n\nA:\n{gemini_text}\n\nB:\n{openai_text}",
            },
        ],
        max_tokens=450,
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()


async def write_recommendation_blurbs(campaigns: list, preferences: dict = None) -> list:
    """Dashboard recommendations — personalized blurbs."""
    if not campaigns or not is_configured():
        return campaigns

    preferences = preferences or {}
    interest = preferences.get("category", "campaigns you might like")

    campaign_data = "\n".join(
        f"{i+1}. {c.get('title')} — {c.get('description', '')[:100]}"
        for i, c in enumerate(campaigns)
    )

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a dashboard recommendation engine. Write one short sentence per campaign "
                    "explaining why it fits the user's interest. Numbered list only."
                ),
            },
            {
                "role": "user",
                "content": f"User interest: {interest}\n\nCampaigns:\n{campaign_data}",
            },
        ],
        max_tokens=300,
        temperature=0.7,
    )

    blurbs = response.choices[0].message.content.strip().split("\n")
    enriched = []
    for i, campaign in enumerate(campaigns):
        blurb = blurbs[i].lstrip("0123456789.) ") if i < len(blurbs) else ""
        enriched.append({**campaign, "aiBlurb": blurb})
    return enriched


async def generate_guidance(campaign: dict) -> str:
    """Dashboard campaign performance guidance."""
    if not is_configured():
        raise RuntimeError("OpenAI not configured")

    title = campaign.get("title", "Campaign")
    desc = campaign.get("description", "")
    status = campaign.get("status", "active")
    views = campaign.get("views", 0)

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a campaign dashboard advisor. Give 4 actionable management tips "
                    "based on analytics and status. Focus on performance improvement."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Campaign: {title}\nDescription: {desc}\nStatus: {status}\nViews: {views}"
                ),
            },
        ],
        max_tokens=350,
        temperature=0.6,
    )
    return response.choices[0].message.content.strip()
