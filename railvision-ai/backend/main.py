"""
RailVision AI — Application Entry Point

Creates the FastAPI application, wires up the lifespan (AI Module Engine loading),
and includes all route modules.

Run with:
    python -m uvicorn main:app --reload          (development)
    python -m uvicorn main:app --workers 1       (production — 1 worker for GPU)
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import router
from app.utils.file_utils import ensure_directories

# AI Engine imports
from app.ai.base.module_registry import ModuleRegistry
from app.ai.person.config import PersonDetectionConfig
from app.ai.person.module import PersonDetectionModule
from app.ai.crowd.config import CrowdAnalysisConfig
from app.ai.crowd.module import CrowdAnalysisModule
from app.ai.crime.config import CrimeDetectionConfig
from app.ai.crime.module import CrimeDetectionModule
from app.ai.worker.config import WorkerMonitoringConfig
from app.ai.worker.module import WorkerMonitoringModule
from app.services.llm_service import llm_service

# ── Logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("railvision")


# ── Lifespan — AI Engine loading & directory setup ───────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup
    -------
    1. Create required directories.
    2. Register & initialize AI Modules via singleton ModuleRegistry.

    Shutdown
    --------
    Log a clean shutdown message.
    """
    settings = get_settings()

    logger.info("═" * 60)
    logger.info("  %s v%s  — Modular AI Engine starting up", settings.app_name, settings.app_version)
    logger.info("═" * 60)

    # 1. Ensure uploads/ outputs/ weights/ exist
    ensure_directories()

    # 2. Register AI Modules
    registry = ModuleRegistry.get_instance()

    # Person Detection (WORKING)
    person_cfg = PersonDetectionConfig(
        enabled=settings.enable_person_detection,
        model_path=settings.model_name,
        confidence=settings.model_confidence,
        iou_threshold=settings.model_iou_threshold,
        device=settings.model_device,
        weights_dir=settings.weights_dir,
    )
    registry.register(PersonDetectionModule(person_cfg))

    # Crowd Analysis (PRODUCTION)
    crowd_cfg = CrowdAnalysisConfig(
        enabled=settings.enable_crowd_analysis,
        output_dir=settings.output_dir,
    )
    registry.register(CrowdAnalysisModule(crowd_cfg))

    # Crime Detection (PRODUCTION)
    crime_cfg = CrimeDetectionConfig(
        enabled=settings.enable_crime_detection,
        output_dir=settings.output_dir,
    )
    registry.register(CrimeDetectionModule(crime_cfg))

    # Worker Monitoring
    worker_cfg = WorkerMonitoringConfig(
        enabled=settings.enable_worker_monitoring,
    )
    registry.register(WorkerMonitoringModule(worker_cfg))

    from app.ai.fall.config import FallDetectionConfig
    from app.ai.fall.module import FallDetectionModule
    from app.ai.weapon.module import WeaponDetectionModule
    from app.ai.weapon.config import WeaponDetectionConfig
    
    fall_module = FallDetectionModule(FallDetectionConfig())
    registry.register(fall_module)
    
    weapon_module = WeaponDetectionModule(WeaponDetectionConfig())
    registry.register(weapon_module)

    # 3. Initialize active modules (CV)
    registry.initialize_all()

    # 4. Initialize LLM (RailVision AI Master)
    # This might take a bit of time to download/load the 8B model into memory.
    llm_service.initialize()

    yield  # ← Application is running

    logger.info("Shutting down %s …", settings.app_name)


# ── FastAPI application ──────────────────────────────────────────────
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Backend Modular AI Engine service for RailVision — "
        "upload videos and receive multi-module analytics."
    ),
    lifespan=lifespan,
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error on {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "path": str(request.url.path)}
    )

# ── CORS (wide-open for local dev — tighten in production) ───────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routes ─────────────────────────────────────────────────────
app.include_router(router)
