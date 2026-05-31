"""CoralFlow orchestrator entrypoint.

    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .routes import router as agents_router

app = FastAPI(title="CoralFlow Orchestrator", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the frontend origin before deploy
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": __version__}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Orchestrator is awake"}
