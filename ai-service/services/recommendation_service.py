from services import gemini_service, openai_service


async def get_recommendations(campaigns: list, preferences: dict = None) -> list:
    """
    Dual-AI recommendation pipeline:
    1. Gemini ranks campaigns by relevance
    2. OpenAI writes personalized blurbs for top picks
    """
    preferences = preferences or {}
    limit = preferences.get("limit", 3)

    if not campaigns:
        return []

    # Step 1: Gemini intelligent ranking (falls back to rule-based)
    if gemini_service.is_configured():
        ranked = await gemini_service.rank_campaigns(campaigns, preferences)
    else:
        ranked = _rule_based_rank(campaigns, preferences)[:limit]

    # Step 2: OpenAI personalized blurbs
    if openai_service.is_configured():
        return await openai_service.write_recommendation_blurbs(ranked, preferences)

    return [{**c, "aiBlurb": c.get("description", "")[:80]} for c in ranked]


def _rule_based_rank(campaigns: list, preferences: dict) -> list:
    """Fallback ranking when Gemini unavailable."""
    preferred_category = preferences.get("category", "").lower()
    limit = preferences.get("limit", 3)

    scored = []
    for campaign in campaigns:
        score = 0
        text = (campaign.get("title", "") + campaign.get("description", "")).lower()
        if preferred_category and preferred_category in text:
            score += 3
        remaining = campaign.get("remainingMs")
        if remaining and remaining > 7 * 86400000:
            score += 2
        scored.append({**campaign, "relevanceScore": score})

    scored.sort(key=lambda x: x["relevanceScore"], reverse=True)
    return scored[:limit]
