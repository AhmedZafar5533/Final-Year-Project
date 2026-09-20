#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "===================================================="
echo " Starting Sentiment Microservice (FastAPI + RoBERTa)"
echo " Endpoint: http://localhost:8000"
echo " Interactive Docs: http://localhost:8000/docs"
echo "===================================================="

if [ -f ".venv/bin/python" ]; then
    .venv/bin/python main.py
elif [ -f "venv/bin/python" ]; then
    venv/bin/python main.py
else
    python3 main.py
fi
