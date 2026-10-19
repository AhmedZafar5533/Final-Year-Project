import logging
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="YouTube Transcript Microservice",
    description="Fetches YouTube transcripts. Sentiment analysis runs through DeepSeek in the Node.js backend.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None


@app.get("/")
def read_root():
    return {
        "service": "YouTube Transcript Service",
        "engine": "FastAPI + youtube-transcript-api",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "YouTube Transcript Service",
        "transcript_available": YouTubeTranscriptApi is not None,
    }


@app.get("/transcript")
def get_video_transcript(videoId: str, languages: Optional[str] = "en"):
    if not YouTubeTranscriptApi:
        raise HTTPException(status_code=503, detail="youtube-transcript-api is not installed")
    try:
        lang_list = [language.strip() for language in (languages or "en").split(",") if language.strip()]
        # Support both the current client API and older installed versions.
        if hasattr(YouTubeTranscriptApi, "fetch"):
            transcript_data = YouTubeTranscriptApi().fetch(videoId, languages=lang_list).to_raw_data()
        else:
            transcript_data = YouTubeTranscriptApi.get_transcript(videoId, languages=lang_list)
        return {
            "videoId": videoId,
            "count": len(transcript_data),
            "transcript": transcript_data,
        }
    except Exception as error:
        # Missing captions, upstream blocking and client failures need different diagnostics.
        error_type = type(error).__name__
        missing = {"NoTranscriptFound", "TranscriptsDisabled", "VideoUnavailable", "VideoUnplayable"}
        blocked = {"RequestBlocked", "IpBlocked", "TooManyRequests", "PoTokenRequired"}
        status = 404 if error_type in missing else 503 if error_type in blocked else 502
        logger.warning(
            "Transcript request failed videoId=%s languages=%s error=%s: %s",
            videoId, languages, error_type, " ".join(str(error).split())[:1000],
        )
        raise HTTPException(
            status_code=status, detail=f"Transcript unavailable ({error_type}): {error}"
        ) from error


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    print(f"Starting transcript service on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
