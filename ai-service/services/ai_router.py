"""
Split AI routing:
- Gemini → presentation & content generation (captions, slogans, multi-platform copy)
- OpenAI → dashboard management (analytics, performance, campaign ops)
"""

from typing import Optional
from services import gemini_service, openai_service
from services.local_fallback_service import generate_local_response

# Chat types that always use Gemini
GEMINI_TYPES = frozenset({
    'presentation',
    'caption',
    'content',
    'distribution',
})

# Chat types that always use OpenAI
OPENAI_TYPES = frozenset({
    'dashboard',
    'analytics',
    'management',
})

DASHBOARD_PAGE_PREFIXES = ('/dashboard', '/campaign/', '/admin', '/notifications', '/settings')


def _is_dashboard_page(page: str = '') -> bool:
    if not page:
        return False
    if page.startswith('/dashboard') or page.startswith('/admin'):
        return True
    if '/performance' in page:
        return True
    return False


def resolve_provider(chat_type: str, context: dict = None) -> str:
    """Return 'gemini' or 'openai'."""
    context = context or {}
    chat_type = (chat_type or 'assistant').lower()

    if chat_type in GEMINI_TYPES:
        return 'gemini'
    if chat_type in OPENAI_TYPES:
        return 'openai'

    page = context.get('page') or ''
    if _is_dashboard_page(page):
        return 'openai'

    # Upload & public marketing pages → Gemini for content/platform help
    if '/upload' in page or chat_type == 'assistant':
        return 'gemini'

    return 'gemini'


def _fallback(message: str, context: dict) -> dict:
    return {
        'reply': generate_local_response(message, context),
        'mode': 'fallback',
        'providers': [],
    }


async def _safe_call(coro, label: str) -> Optional[str]:
    try:
        import asyncio
        return await asyncio.wait_for(coro, timeout=30.0)
    except Exception as e:
        print(f"{label} error: {e}")
        return None


async def generate_response(
    message: str,
    context: dict = None,
    chat_type: str = 'assistant',
) -> dict:
    context = context or {}
    provider = resolve_provider(chat_type, context)
    gemini_ok = gemini_service.is_configured()
    openai_ok = openai_service.is_configured()

    if provider == 'gemini':
        if gemini_ok:
            reply = await _safe_call(gemini_service.chat(message, context, chat_type), 'Gemini')
            if reply:
                return {'reply': reply, 'mode': 'gemini', 'providers': ['gemini']}
        if openai_ok:
            reply = await _safe_call(openai_service.chat(message, context, chat_type), 'OpenAI fallback')
            if reply:
                return {'reply': reply, 'mode': 'openai', 'providers': ['openai']}
        return _fallback(message, context)

    # OpenAI path (dashboard management)
    if openai_ok:
        reply = await _safe_call(openai_service.chat(message, context, chat_type), 'OpenAI')
        if reply:
            return {'reply': reply, 'mode': 'openai', 'providers': ['openai']}
    if gemini_ok:
        reply = await _safe_call(gemini_service.chat(message, context, chat_type), 'Gemini fallback')
        if reply:
            return {'reply': reply, 'mode': 'gemini', 'providers': ['gemini']}
    return _fallback(message, context)


async def generate_guidance(campaign: dict, context: dict = None) -> dict:
    """Dashboard campaign guidance — OpenAI only."""
    context = context or {}
    context['campaignTitle'] = campaign.get('title', '')
    context['campaign'] = campaign

    if openai_service.is_configured():
        reply = await _safe_call(openai_service.generate_guidance(campaign), 'OpenAI guidance')
        if reply:
            return {'reply': reply, 'mode': 'openai', 'providers': ['openai']}

    if gemini_service.is_configured():
        prompt = (
            f"Give 4 actionable dashboard tips for managing campaign '{campaign.get('title')}' "
            f"on CampaignHub (analytics, sharing, performance). Bullet format."
        )
        reply = await _safe_call(gemini_service.chat(prompt, context, 'dashboard'), 'Gemini guidance fallback')
        if reply:
            return {'reply': reply, 'mode': 'gemini', 'providers': ['gemini']}

    return {
        'reply': 'Check your dashboard analytics, share your campaign link, and track QR scans to measure performance.',
        'mode': 'fallback',
        'providers': [],
    }
