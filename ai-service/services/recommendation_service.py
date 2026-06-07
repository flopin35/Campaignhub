from services import openai_service, gemini_service


async def get_recommendations(campaigns: list, preferences: dict = None) -> list:
    """
    Dashboard recommendations — OpenAI ranks and writes blurbs.
    Falls back to rule-based + Gemini ranking if OpenAI unavailable.
    """
    preferences = preferences or {}
    limit = preferences.get("limit", 3)

    if not campaigns:
        return []

    ranked = _rule_based_rank(campaigns, preferences)[:limit]

    if openai_service.is_configured():
        return await openai_service.write_recommendation_blurbs(ranked, preferences)

    if gemini_service.is_configured():
        ranked = await gemini_service.rank_campaigns(campaigns, preferences)

    return [{**c, "aiBlurb": c.get("description", "")[:80]} for c in ranked]
