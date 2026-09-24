# Antigravity Studio (OnlyCreators)

> **Advanced AI-Powered YouTube Content Optimization, Deep Sentiment Analysis & Script Generation Platform**

Welcome to the **Antigravity Studio** codebase. The platform integrates YouTube Analytics & Data v3 APIs, a dedicated PyTorch Transformer microservice (`cardiffnlp/twitter-roberta-base-sentiment-latest`), DeepSeek LLM cognitive synthesis, and a high-performance React 19 single-page application.

---

## 📖 System Architecture & Engineering Deep-Dive

For a complete, highly detailed architectural specification covering:
- **Distributed Microservices Topology & Technology Matrix**
- **End-to-End Pipeline Workflows (OAuth, Ingestion, Sentiment, Chapters, Triangulation, Script Studio)**
- **Gnarly Architectural Details & Complex Edge-Case Handling** (Proactive Token Refresh, 512-Token Transformer Limits, Negation Inversion Windows, Non-Linear Regex Timestamp Disambiguation)
- **Module-by-Module Code Reference & Data Schemas**
- **Multi-Tiered Caching Hierarchy & Synchronous Hydration Strategy**
- **Environment Configuration & Service Orchestration Runbook**

👉 **Please refer to the comprehensive engineering document: [`ARCHITECTURE.md`](./ARCHITECTURE.md)**

---

## 🚀 Quick Start Overview

The platform consists of three cooperating services:

1. **Python Sentiment Analysis Microservice** (`sentiment_service/`):
   ```bash
   cd sentiment_service
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python main.py  # Runs FastAPI on http://localhost:8000
   ```

2. **Express Orchestration Gateway** (`backend/`):
   ```bash
   cd backend
   npm install
   npm run dev  # Runs Express on http://localhost:5000
   ```

3. **React 19 Frontend Client** (`frontend/`):
   ```bash
   cd frontend
   npm install
   npm run dev  # Runs Vite dev server on http://localhost:5173
   ```
