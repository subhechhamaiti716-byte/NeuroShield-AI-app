from fastapi import APIRouter, Depends
import time
import psutil
import os
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

START_TIME = time.time()

@router.get("/status")
def get_system_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Advanced System Monitoring Dashboard.
    Provides real-time health metrics for the NeuroShield infrastructure.
    """
    if not current_user.is_admin:
        return {"error": "Unauthorized. Admin privileges required for system monitoring."}

    # 1. Calculate Uptime
    uptime_seconds = int(time.time() - START_TIME)
    uptime_str = f"{uptime_seconds // 3600}h {(uptime_seconds % 3600) // 60}m {uptime_seconds % 60}s"

    # 2. Check Database Latency
    db_start = time.time()
    db.execute("SELECT 1")
    db_latency = int((time.time() - db_start) * 1000)

    # 3. System Resources
    process = psutil.Process(os.getpid())
    memory_usage = process.memory_info().rss / (1024 * 1024)  # MB

    # 4. AI Model Status
    model_status = "Healthy"
    try:
        from ml.fraud_detector import model
        if model is None:
            model_status = "Not Loaded"
    except:
        model_status = "Error"

    return {
        "system": {
            "name": "NeuroShield AI Engine",
            "status": "Operational",
            "uptime": uptime_str,
            "version": "1.0.0 (Enterprise)"
        },
        "infrastructure": {
            "database": "PostgreSQL/SQLite" if "db" in str(db.bind.url) else "Unknown",
            "db_latency": f"{db_latency}ms",
            "memory_usage": f"{memory_usage:.2f} MB",
            "active_threads": psutil.cpu_count()
        },
        "ai_engine": {
            "model": "Isolation Forest",
            "status": model_status,
            "inference_mode": "Real-time"
        }
    }
