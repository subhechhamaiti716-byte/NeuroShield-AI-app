"""
NeuroShield FastAPI Backend — main.py
--------------------------------------
Start locally:   uvicorn main:app --reload --port 8000
Docs:            http://localhost:8000/docs
"""

import os
import logging
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from database import engine, SessionLocal, Base
from models import User, Transaction        # noqa: F401 — needed for Base.metadata
from auth import hash_password
from routers import auth as auth_router
from routers import users as users_router
from routers import transactions as tx_router
from routers import monitoring as monitoring_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neuroshield")


# ─── Startup / Shutdown ───────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created / verified.")

    # Seed admin user
    _seed_admin()

    # Pre-load the ML model (warm cache)
    try:
        from ml.fraud_detector import _load_model
        _load_model()
    except Exception as e:
        logger.warning("ML model warm-up failed: %s", e)

    yield
    logger.info("NeuroShield backend shutting down.")


def _seed_admin():
    admin_email    = os.getenv("ADMIN_EMAIL", "admin@neuroshield.ai")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@123")
    admin_name     = "NeuroShield Admin"

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == admin_email).first()
        if not existing:
            admin = User(
                email=admin_email,
                full_name=admin_name,
                hashed_password=hash_password(admin_password),
                is_admin=True,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            logger.info("Admin user seeded: %s", admin_email)
        else:
            logger.info("Admin user already exists: %s", admin_email)
    finally:
        db.close()


# ─── App ──────────────────────────────────────────────────────

app = FastAPI(
    title="NeuroShield AI Fraud Detection API",
    description=(
        "Real-time AI-powered fraud detection for financial transactions. "
        "Built with FastAPI, SQLAlchemy, and scikit-learn."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gzip compression for faster network transfer
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount static files for receipt images
os.makedirs("uploads/receipts", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")


# ─── WebSocket Manager ────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()
app.state.manager = manager  # Store in app state for access in routers

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive, though we mostly push from server
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


# ─── Routers ──────────────────────────────────────────────────

from routers import banking as banking_router
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(tx_router.router)
app.include_router(banking_router.router)
app.include_router(monitoring_router.router)

# ─── Enterprise Integrations ──────────────────────────────────

@app.post("/webhooks/razorpay", tags=["Integrations"])
async def razorpay_webhook(data: dict):
    """
    Enterprise Integration: Razorpay Webhook.
    Monitors real-time bank transactions from external payment gateways.
    """
    logger.info("Razorpay webhook received: %s", data)
    # Trigger AI Fraud Check logic here
    return {"status": "event_received"}

# ─── Health check ─────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "NeuroShield AI Fraud Detection API",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
