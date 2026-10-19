# Contributing

Thanks for helping improve IntelRadar! This guide covers the local workflow and
the conventions to follow when adding features.

## Setup

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env          # add your GEMINI_API_KEY

# Frontend
cd ../frontend
pnpm install
```

Run each side with the commands in the [README](README.md).

## Before opening a PR

- `cd backend && python -m py_compile $(git ls-files '*.py')` compiles cleanly.
- `cd frontend && pnpm lint && pnpm build` passes.
- No secrets are committed (`.env` files are gitignored).

## Conventions

### Backend (FastAPI)

- **One route module per resource** under `app/api/routes/`, each exposing an
  `APIRouter` named `router`. Register it in `ROUTERS` in `app/main.py`.
- **Business logic lives in `app/services/`**, not in route handlers.
- **All environment access goes through `app/core/config.py`.** Never read
  `os.environ` elsewhere.
- Return clear HTTP errors (e.g. `502` with a readable `detail`) rather than
  leaking stack traces.

### Frontend (Next.js)

- Routes live in `src/app/`; feature UI lives in `src/components/dashboard/`;
  reusable primitives in `src/components/ui/`.
- Shared types and helpers go in `src/lib/`.
- Prefer the existing design tokens (`bg-card`, `text-muted-foreground`, …)
  over hard-coded colors.

## Commit messages

Use short, imperative subjects, e.g. `add competitor export endpoint`.
