# Python DistilBERT Sentiment Microservice

A dedicated Python microservice built with **FastAPI**, **Uvicorn**, and **Hugging Face Transformers (DistilBERT)** to run sentiment analysis on YouTube comments independently from the main Node.js backend.

## Features
- **DistilBERT Engine**: Runs `distilbert-base-uncased-finetuned-sst-2-english` via PyTorch.
- **FastAPI + Uvicorn**: High-performance async REST API on port `8000`.
- **Batch Processing**: Supports analyzing single comments or batch requests of 100+ comments at once.
- **Summary Metrics**: Calculates total positive/negative comment counts and percentages.

## API Endpoints

### 1. Health Check
`GET http://localhost:8000/health`
Returns service status and whether the model is loaded in memory.

### 2. Analyze Single Comment
`POST http://localhost:8000/analyze`
```json
{
  "text": "Mind-blowing explanation! The animations made it so clear."
}
```

### 3. Analyze Batch YouTube Comments
`POST http://localhost:8000/analyze-batch`
```json
{
  "comments": [
    {"id": "c1", "text": "Great video!"},
    {"id": "c2", "text": "Terrible explanation, totally wrong."}
  ]
}
```

## Running the Service

```bash
# On Windows:
.\start.bat

# Or manually using the virtual environment:
.\venv\Scripts\python.exe main.py
```
Open interactive Swagger API docs at: `http://localhost:8000/docs`.
