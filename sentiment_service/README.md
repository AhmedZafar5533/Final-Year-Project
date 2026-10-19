# YouTube Transcript Microservice

This FastAPI service now provides YouTube transcripts only. Sentiment analysis runs
through the DeepSeek API in the Node.js backend. No local models are downloaded or
loaded; `transformers` and `torch` are commented out in `requirements.txt`.

## Run

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

You can also use `./start.sh` or `start.bat` with an existing virtual environment.

- `GET /health`: transcript dependency availability.
- `GET /transcript?videoId=VIDEO_ID&languages=en`: timestamped subtitles.
- `GET /docs`: interactive API documentation.

The former `/analyze` and `/analyze-batch` endpoints have been removed. Use the
backend's `GET /api/youtube/video-comments?videoId=VIDEO_ID` with authentication.

## DeepSeek configuration

Set `DEEPSEEK_API_KEY` in `backend/.env`. The optional `DEEPSEEK_MODEL` defaults to
`deepseek-flash`; `DEEPSEEK_API_URL` defaults to
`https://api.deepseek.com/chat/completions`. See `backend/.env.example`.

Sentiment uses batches of up to 25 comments, validates each returned label, and
computes summaries in JavaScript. Identical requests share work and cache labels
for five minutes. Missing credentials or API failures return an unavailable error;
there is no local model, lexicon, or precomputed-result fallback.

To regenerate the optional demo export using DeepSeek, install backend dependencies,
configure `backend/.env`, then run `python analyze_demo_videos.py`. This makes paid
API requests. The export is not used as a runtime sentiment fallback.
