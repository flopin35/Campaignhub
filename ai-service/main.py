from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.ai_routes import router as ai_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="CampaignHub AI Service",
    description="AI microservice for campaign assistance and recommendations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/api/health")
async def health():
    from services import gemini_service, openai_service

    return {
        "status": "healthy",
        "service": "CampaignHub AI",
        "mode": "dual",
        "gemini": gemini_service.is_configured(),
        "openai": openai_service.is_configured(),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
