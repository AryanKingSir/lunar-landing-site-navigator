import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.scenario import ScenarioRequest, compute_scenario
from app.sites import load_sites

app = FastAPI(title="Lunar Landing Site Navigator API", version="0.1.0")
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/sites")
def sites() -> list[dict]:
    return load_sites()


@app.post("/api/scenario")
def scenario(req: ScenarioRequest) -> dict:
    return compute_scenario(req)
