import re
import random

# Keywords mapped to helpful offline responses when APIs are unavailable
CATEGORY_TITLES = {
    "politics": [
        "Voices for Tomorrow",
        "Stand With Us",
        "A Future We Deserve",
        "Together We Rise",
    ],
    "business": [
        "Grow With Us",
        "Your Success Starts Here",
        "Built for Growth",
        "Innovation in Action",
    ],
    "ngo": [
        "Change Starts Here",
        "Hope in Action",
        "Building Brighter Futures",
        "Community First",
    ],
    "events": [
        "Don't Miss This Moment",
        "Join the Experience",
        "Be Part of Something Big",
        "Mark Your Calendar",
    ],
    "education": [
        "Learn. Grow. Lead.",
        "Knowledge for All",
        "Empowering Minds",
        "Education Changes Everything",
    ],
    "religion": [
        "Faith in Action",
        "United in Purpose",
        "Walking Together",
        "Hope and Unity",
    ],
    "entertainment": [
        "Experience the Magic",
        "The Show Must Go On",
        "Unforgettable Moments",
        "Get Ready to Be Amazed",
    ],
    "general": [
        "Make Your Mark",
        "Join the Movement",
        "Together We Can",
        "Your Voice Matters",
    ],
}

SLOGANS = [
    "Real change starts with you.",
    "Together, we make the difference.",
    "Your support powers our mission.",
    "Join us — the time is now.",
    "Stand up. Speak out. Show up.",
]


def _detect_category(message: str, context: dict) -> str:
    cat = (context or {}).get("category", "General").lower()
    if cat in CATEGORY_TITLES:
        return cat
    msg = message.lower()
    for key in CATEGORY_TITLES:
        if key in msg:
            return key
    return "general"


def _is_title_request(message: str) -> bool:
    return bool(re.search(r"title|headline|name", message, re.I))


def _is_slogan_request(message: str) -> bool:
    return bool(re.search(r"slogan|tagline|motto", message, re.I))


def _is_description_request(message: str) -> bool:
    return bool(re.search(r"description|write|copy|about", message, re.I))


def _is_tips_request(message: str) -> bool:
    return bool(re.search(r"tip|engagement|grow|promote|strategy", message, re.I))


def generate_local_response(message: str, context: dict = None) -> str:
    """Smart offline fallback when AI providers are unavailable."""
    context = context or {}
    category = _detect_category(message, context)
    titles = CATEGORY_TITLES.get(category, CATEGORY_TITLES["general"])
    title = random.choice(titles)

    if _is_title_request(message):
        return title

    if _is_slogan_request(message):
        return random.choice(SLOGANS)

    if _is_description_request(message):
        return (
            f"Join our {category} campaign and be part of something meaningful. "
            f"We're building momentum to reach more people, share our message, and create real impact. "
            f"Your support helps us grow — share our link, scan our QR code, and spread the word."
        )

    if _is_tips_request(message):
        return (
            "• Share your campaign link on WhatsApp and social media daily.\n"
            "• Print your QR code on flyers and posters for offline reach.\n"
            "• Ask supporters to follow and comment to boost visibility."
        )

    msg = message.lower()
    if any(w in msg for w in ["upload", "submit", "create", "launch"]):
        return (
            "Go to Upload → fill in your title, description, and banner → pick a package → "
            "pay via MoMo (0509002402) → upload payment proof. Admin verifies within 24 hours "
            "and your campaign goes live at /campaign/your-slug with a share link and QR code."
        )
    if any(w in msg for w in ["payment", "pay", "price", "cost", "package"]):
        return (
            "Packages: Starter 100 GHS (7 days), Standard 250 GHS (14 days), "
            "Premium 500 GHS (30 days, featured), Elite 600 GHS (45 days, spotlight). "
            "Pay to MoMo 0509002402 (Cynthia Okyere) and upload your screenshot as proof."
        )
    if any(w in msg for w in ["link", "share", "url", "qr", "whatsapp"]):
        return (
            "Every live campaign gets a unique link like /campaign/your-name plus a QR code. "
            "Use Copy Link, WhatsApp share, or download the QR for posters and flyers. "
            "All shares and scans are tracked in your analytics dashboard."
        )
    if any(w in msg for w in ["extend", "expiry", "expire", "renew"]):
        return (
            "When your campaign is near expiry, click Extend Campaign on your dashboard. "
            "Choose 7, 14, or 30 extra days, pay via MoMo, upload proof, and admin approves — "
            "your existing campaign end date is extended (no new campaign needed)."
        )
    if any(w in msg for w in ["verify", "verified", "trust"]):
        return (
            "Verified campaigns show a blue badge after admin review. "
            "This builds trust with supporters. Payment verification also activates your campaign."
        )

    return (
        "I'm your CampaignHub assistant! I can help with uploading campaigns, packages & payment, "
        "sharing links & QR codes, extending campaigns, and growth tips. What would you like to know?"
    )
