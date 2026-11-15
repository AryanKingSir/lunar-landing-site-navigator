import os
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.scenario import ScenarioRequest, ServerBusy, compute_scenario, warm_default_scenarios
from app.sites import load_sites

@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.environ.get("WARM_CACHE") != "0":
        threading.Thread(target=warm_default_scenarios, daemon=True).start()
    yield


app = FastAPI(title="Lunar Landing Site Navigator API", version="0.1.0", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.api_route("/api/health", methods=["GET", "HEAD"])  # HEAD: uptime monitors such as UptimeRobot
async def health() -> dict:
    return {"status": "ok"}


@app.get("/api/sites")
async def sites() -> list[dict]:
    return load_sites()


@app.post("/api/scenario")
def scenario(req: ScenarioRequest) -> dict:
    return compute_scenario(req)


@app.exception_handler(ServerBusy)
async def server_busy_handler(_request: Request, _exc: ServerBusy) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": "The server is busy. Try again in a moment."},
                        headers={"Retry-After": "5"})
