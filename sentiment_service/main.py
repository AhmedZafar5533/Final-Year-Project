import os
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import pipeline

app = FastAPI(
    title="YouTube Sentiment Analysis Microservice",
    description="Python microservice using FastAPI, Uvicorn, and DistilBERT to analyze YouTube comment sentiment.",
    version="1.0.0"
)

# Enable CORS for Node.js backend (port 5000) and Vite frontend (port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model pipeline
sentiment_pipeline = None

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

MODEL_NAME = os.getenv("MODEL_NAME", "cardiffnlp/twitter-roberta-base-sentiment-latest")

@app.on_event("startup")
def load_model():
    global sentiment_pipeline
    print(f"Loading RoBERTa 3-class sentiment model ({MODEL_NAME})...")
    start_time = time.time()
    try:
        sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
            local_files_only=True,
            top_k=None
        )
        print(f"RoBERTa sentiment model loaded successfully from local cache in {time.time() - start_time:.2f} seconds!")
    except Exception:
        try:
            sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=MODEL_NAME,
                tokenizer=MODEL_NAME,
                top_k=None
            )
            print(f"RoBERTa sentiment model loaded successfully in {time.time() - start_time:.2f} seconds!")
        except Exception as e:
            print(f"Error loading model: {e}")

class SingleTextRequest(BaseModel):
    text: str = Field(..., json_schema_extra={"example": "This video was absolutely mind-blowing! Best physics channel on YouTube."})

class CommentItem(BaseModel):
    id: Optional[str] = None
    text: str
    author: Optional[str] = None
    likes: Optional[int] = 0
    publishedAt: Optional[str] = None

class BatchCommentsRequest(BaseModel):
    comments: List[CommentItem]

@app.get("/")
def read_root():
    return {
        "service": "YouTube Sentiment Analysis Service",
        "engine": "FastAPI + Uvicorn + Twitter-RoBERTa (3-class: Positive, Neutral, Negative)",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "model": MODEL_NAME,
        "classes": ["POSITIVE", "NEUTRAL", "NEGATIVE"],
        "model_loaded": sentiment_pipeline is not None
    }

@app.get("/transcript")
def get_video_transcript(videoId: str, languages: Optional[str] = "en"):
    if not YouTubeTranscriptApi:
        raise HTTPException(status_code=500, detail="youtube-transcript-api is not installed")
    try:
        lang_list = [l.strip() for l in languages.split(",") if l.strip()]
        transcript_data = YouTubeTranscriptApi.get_transcript(videoId, languages=lang_list)
        return {
            "videoId": videoId,
            "count": len(transcript_data),
            "transcript": transcript_data
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Transcript unavailable: {str(e)}")

@app.post("/analyze")
def analyze_single(req: SingleTextRequest):
    if not sentiment_pipeline:
        raise HTTPException(status_code=503, detail="Model is loading or unavailable")
    
    clean_text = req.text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    truncated_text = clean_text[:512]
    raw_results = sentiment_pipeline([truncated_text])[0]
    
    top_pred = max(raw_results, key=lambda x: x['score'])
    
    return {
        "text": clean_text,
        "sentiment": top_pred['label'].upper(),
        "confidence": round(top_pred['score'], 4),
        "scores": {item['label'].upper(): round(item['score'], 4) for item in raw_results}
    }

@app.post("/analyze-batch")
def analyze_batch(req: BatchCommentsRequest):
    if not sentiment_pipeline:
        raise HTTPException(status_code=503, detail="Model is loading or unavailable")
    
    if not req.comments:
        return {
            "total": 0,
            "summary": {
                "positive_count": 0,
                "neutral_count": 0,
                "negative_count": 0,
                "positive_percentage": 0.0,
                "neutral_percentage": 0.0,
                "negative_percentage": 0.0
            },
            "comments": []
        }
    
    texts = [c.text[:512] for c in req.comments]
    batch_results = sentiment_pipeline(texts)
    
    analyzed_comments = []
    pos_count = 0
    neu_count = 0
    neg_count = 0
    
    for comment_item, result_list in zip(req.comments, batch_results):
        top_pred = max(result_list, key=lambda x: x['score'])
        label = top_pred['label'].upper()
        confidence = round(top_pred['score'], 4)
        
        if "POS" in label:
            pos_count += 1
        elif "NEU" in label:
            neu_count += 1
        else:
            neg_count += 1
            
        comment_dict = comment_item.dict()
        comment_dict["sentiment"] = {
            "label": label,
            "confidence": confidence,
            "scores": {item['label'].upper(): round(item['score'], 4) for item in result_list}
        }
        analyzed_comments.append(comment_dict)
        
    total = len(analyzed_comments)
    pos_pct = round((pos_count / total) * 100, 1) if total > 0 else 0.0
    neu_pct = round((neu_count / total) * 100, 1) if total > 0 else 0.0
    neg_pct = round((neg_count / total) * 100, 1) if total > 0 else 0.0
    
    return {
        "total": total,
        "summary": {
            "positive_count": pos_count,
            "neutral_count": neu_count,
            "negative_count": neg_count,
            "positive_percentage": pos_pct,
            "neutral_percentage": neu_pct,
            "negative_percentage": neg_pct
        },
        "comments": analyzed_comments
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting Uvicorn server on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
