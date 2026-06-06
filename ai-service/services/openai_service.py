import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are CampaignHub GPT Assistant — thoughtful guide for a digital campaign hosting platform.

Focus on:
- Clear explanations of campaign workflows and best practices
- Creative tips for banners, copy, and audience engagement
- Strategic advice for maximizing campaign visibility
- Professional, warm tone suited for startups and nonprofits

Platform facts:
- Status flow: pending → payment confirmed → active → expired
- Public URLs: /campaigns/campaign-slug
- Manual payment confirmation before admin approval
- Durations: 7, 14, 30, or 60 days

Keep responses helpful and concise (3-5 sentences unless the user needs detail)."""


def is_configured() -> bool:
    return bool(OPENAI_API_KEY)


def _build_messages(message: str, context: dict) -> list:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    context_parts = []
    if context.get("campaignTitle"):
        context_parts.append(f"User is viewing campaign: {context['campaignTitle']}")
    if context.get("page"):
        context_parts.append(f"Current page: {context['page']}")
    if context.get("history"):
        for turn in context["history"][-4:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
    if context_parts:
        messages[0]["content"] += "\n\n" + "\n".join(context_parts)

    messages.append({"role": "user", "content": message})
    return messages


async def chat(message: str, context: dict = None) -> str:
    """OpenAI-powered chat response."""
    context = context or {}

    if not is_configured():
        raise RuntimeError("OpenAI API key not configured")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=_build_messages(message, context),
        max_tokens=500,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


async def synthesize(gemini_text: str, openai_text: str, original_message: str) -> str:
    """Merge both AI responses into one seamless answer."""
    if not is_configured():
        return openai_text or gemini_text

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You merge two expert responses into ONE final answer for CampaignHub users. "
                    "Combine the best insights. Be concise, warm, and professional. "
                    "Never mention AI models or that multiple sources were used."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"User question: {original_message}\n\n"
                    f"Expert A:\n{gemini_text}\n\n"
                    f"Expert B:\n{openai_text}\n\n"
                    "Write the final merged response:"
                ),
            },
        ],
        max_tokens=450,
        temperature=0.5,
    )
    return response.choices[0].message.content.strip()


async def write_recommendation_blurbs(campaigns: list, preferences: dict = None) -> list:
    """Generate personalized recommendation text for ranked campaigns."""
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
                    "Write a short personalized blurb (1 sentence each) for each campaign recommendation. "
                    "Return as numbered list matching the input order. No extra text."
                ),
            },
            {
                "role": "user",
                "content": f"User interest: {interest}\n\nCampaigns:\n{campaign_data}",
            },
        ],
        max_tokens=300,
        temperature=0.8,
    )

    blurbs = response.choices[0].message.content.strip().split("\n")
    enriched = []
    for i, campaign in enumerate(campaigns):
        blurb = blurbs[i].lstrip("0123456789.) ") if i < len(blurbs) else ""
        enriched.append({**campaign, "aiBlurb": blurb})
    return enriched


async def generate_guidance(campaign: dict) -> str:
    """Deep campaign guidance using GPT."""
    if not is_configured():
        raise RuntimeError("OpenAI not configured")

    title = campaign.get("title", "Campaign")
    desc = campaign.get("description", "")
    status = campaign.get("status", "active")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a campaign growth advisor. Give 4 actionable bullet tips "
                    "for promoting this campaign. Be specific and practical."
                ),
            },
            {
                "role": "user",
                "content": f"Campaign: {title}\nDescription: {desc}\nStatus: {status}",
            },
        ],
        max_tokens=350,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()
