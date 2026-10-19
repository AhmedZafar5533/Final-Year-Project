"""FastAPI application entrypoint.

Run from the ``backend/`` directory:

    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

The server binds to loopback only: it is a local desktop engine, not a public
service. Set ``API_TOKEN`` to require a per-launch token on ``/api`` requests.

To add a feature, create a module under ``app/api/routes/`` exposing an
``APIRouter`` named ``router`` and register it in ``ROUTERS`` below.
"""

import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    analysis,
    compare,
    competitors,
    health,
    license,
    monitor,
    scans,
    settings,
)
from app.core.config import API_TOKEN, CORS_ORIGINS, SCREENSHOTS_DIR
from app.services import scheduler as monitoring

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)

# Register new routers here.
ROUTERS = (
    health.router,
    competitors.router,
    scans.router,
    analysis.router,
    compare.router,
    monitor.router,
    settings.router,
    license.router,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Start the background monitor on boot and stop it on shutdown."""
    monitoring.start()
    try:
        yield
    finally:
        monitoring.shutdown()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    app = FastAPI(
        title="IntelRadar Autonomous Intelligence & War-Room Engine",
        description=(
            "Autonomous multi-agent intelligence platform that tracks competitors, "
            "pricing, features and customer sentiment."
        ),
        version="1.2.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def require_api_token(request: Request, call_next):
        """Guard the local engine when API_TOKEN is configured.

        Health checks and CORS preflights stay open; everything else under
        /api needs the token the desktop shell passed to the frontend.
        """
        if (
            not API_TOKEN
            or request.method == "OPTIONS"
            or request.url.path == "/api/health"
            or not request.url.path.startswith("/api")
        ):
            return await call_next(request)

        provided = request.headers.get("x-intelradar-token", "")
        authorization = request.headers.get("authorization", "")
        if not provided and authorization.lower().startswith("bearer "):
            provided = authorization[7:].strip()

        if not hmac.compare_digest(provided, API_TOKEN):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        return await call_next(request)

    # Serve browser-agent screenshots for visual inspection.
    app.mount(
        "/screenshots",
        StaticFiles(directory=str(SCREENSHOTS_DIR)),
        name="screenshots",
    )

    for router in ROUTERS:
        app.include_router(router)

    return app


app = create_app()
