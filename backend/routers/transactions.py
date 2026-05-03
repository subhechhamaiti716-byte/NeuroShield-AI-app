from datetime import datetime, timezone
import time
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, BackgroundTasks
import shutil
import os
from sqlalchemy.orm import Session
import logging

from database import get_db
from models import Transaction, User

logger = logging.getLogger("neuroshield.transactions")
from schemas import (
    TransactionCheckRequest,
    TransactionCheckResponse,
    TransactionFeedback,
    TransactionResponse,
    AnalyticsResponse,
)
from auth import get_current_user
from ml.fraud_detector import predict as fraud_predict

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# ─── Helper: derive "group" label ─────────────────────────────

def _group_label(created_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    delta = now - created_at.replace(tzinfo=timezone.utc) if created_at.tzinfo is None else now - created_at
    days = delta.days
    if days == 0:
        return "TODAY"
    if days == 1:
        return "YESTERDAY"
    return created_at.strftime("%d %b %Y")


# ─── Check / Create transaction ───────────────────────────────

@router.post(
    "/check",
    response_model=TransactionCheckResponse,
    status_code=201,
    summary="Run fraud check and save transaction",
)
def check_transaction(
    payload: TransactionCheckRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    1. Runs ML fraud detection on the transaction.
    2. Persists the transaction with the fraud score.
    3. Returns the fraud result to the mobile app.
    """
    is_fraud, fraud_score, risk_label = fraud_predict(
        amount=payload.amount,
        category=payload.category,
        location=payload.location,
        time_str=payload.time,
        device_model=payload.device_model,
        os_name=payload.os,
    )
    
    logger.info("Transaction check: User %s, Amount %s, Risk %s (%s)", 
                current_user.email, payload.amount, fraud_score, risk_label)

    tx = Transaction(
        user_id=current_user.id,
        amount=payload.amount,
        category=payload.category,
        location=payload.location,
        note=payload.note,
        device_model=payload.device_model,
        os=payload.os,
        time=payload.time,
        merchant=payload.merchant,
        fraud_score=fraud_score,
        is_fraud=is_fraud,
        status="Action Required" if is_fraud else "Completed",
        group=_group_label(datetime.now(timezone.utc)),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    if is_fraud:
        message = (
            f"⚠️ Suspicious transaction of ${payload.amount:.2f} detected. "
            f"Risk score: {fraud_score:.0%}. Please verify."
        )
        # Push real-time alert via WebSocket if user is connected
        try:
            manager = request.app.state.manager
            import asyncio
            asyncio.create_task(manager.send_personal_message({
                "type": "FRAUD_ALERT",
                "tx_id": tx.id,
                "amount": tx.amount,
                "merchant": tx.merchant,
                "score": tx.fraud_score,
                "message": message
            }, current_user.id))
        except Exception as e:
            logger.error("WebSocket notification failed for User %s: %s", current_user.id, e)
    else:
        message = f"✅ Transaction of ${payload.amount:.2f} looks safe. Risk score: {fraud_score:.0%}."

    # Invalidate analytics cache
    if current_user.id in ANALYTICS_CACHE:
        del ANALYTICS_CACHE[current_user.id]

    return TransactionCheckResponse(
        id=tx.id,
        is_fraud=is_fraud,
        fraud_score=fraud_score,
        risk_label=risk_label,
        message=message,
    )


# ─── List transactions ─────────────────────────────────────────

@router.get(
    "",
    response_model=List[TransactionResponse],
    summary="Get all transactions for current user",
)
def list_transactions(
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if q:
        search_filter = f"%{q}%"
        query = query.filter(
            (Transaction.merchant.ilike(search_filter)) | 
            (Transaction.category.ilike(search_filter)) |
            (Transaction.note.ilike(search_filter))
        )

    txs = (
        query.order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    # Recompute group labels dynamically
    for tx in txs:
        tx.group = _group_label(tx.created_at)
    return txs


# ─── Single transaction ────────────────────────────────────────

@router.get(
    "/{tx_id}",
    response_model=TransactionResponse,
    summary="Get a single transaction",
)
def get_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx.group = _group_label(tx.created_at)
    return tx


# ─── User feedback (safe / fraud) ─────────────────────────────

@router.patch(
    "/{tx_id}/feedback",
    response_model=TransactionResponse,
    summary="Submit user feedback on a transaction",
)
def submit_feedback(
    tx_id: int,
    payload: TransactionFeedback,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called when the user taps 'Yes, It's Me' (safe) or 'Report Fraud' (fraud)
    on the alert screen.
    """
    if payload.feedback not in ("safe", "fraud"):
        raise HTTPException(status_code=400, detail="feedback must be 'safe' or 'fraud'")

    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx.user_feedback = payload.feedback
    if payload.feedback == "fraud":
        tx.is_fraud = True
        tx.status = "Action Required"
    else:
        tx.status = "Completed"

    db.commit()
    db.refresh(tx)
    
    logger.info("User feedback received: Transaction %s, Feedback %s", tx_id, payload.feedback)
    
    # Invalidate analytics cache
    if current_user.id in ANALYTICS_CACHE:
        del ANALYTICS_CACHE[current_user.id]

    tx.group = _group_label(tx.created_at)
    return tx


# ─── Upload Receipt Image ─────────────────────────────────────

@router.post(
    "/{tx_id}/upload-receipt",
    response_model=TransactionResponse,
    summary="Upload a receipt image for a transaction",
)
async def upload_receipt(
    tx_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Ensure uploads directory exists
    upload_dir = "uploads/receipts"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    file_name = f"tx_{tx_id}_{int(datetime.now().timestamp())}{file_ext}"
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update DB
    tx.receipt_image = f"/static/receipts/{file_name}"
    db.commit()
    db.refresh(tx)
    
    logger.info("Receipt uploaded: Transaction %s, File %s", tx_id, file_name)
    
    tx.group = _group_label(tx.created_at)
    return tx


# --- In-Memory Cache for Analytics ---
ANALYTICS_CACHE = {}  # {user_id: {"data": AnalyticsResponse, "timestamp": float}}
CACHE_TTL = 300       # 5 minutes

@router.get(
    "/analytics/summary",
    response_model=AnalyticsResponse,
    summary="Get analytics summary for current user (Cached)",
)
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check cache
    user_id = current_user.id
    now = time.time()
    if user_id in ANALYTICS_CACHE:
        cache_entry = ANALYTICS_CACHE[user_id]
        if now - cache_entry["timestamp"] < CACHE_TTL:
            logger.info("Serving analytics from cache for User %s", user_id)
            return cache_entry["data"]

    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    if not txs:
        return AnalyticsResponse(
            total_transactions=0,
            total_spent=0,
            total_received=0,
            fraud_count=0,
            safe_count=0,
            risk_score=0.0,
            category_breakdown={},
        )

    total_spent    = sum(abs(t.amount) for t in txs if t.amount < 0)
    total_received = sum(t.amount for t in txs if t.amount > 0)
    fraud_count    = sum(1 for t in txs if t.is_fraud)
    safe_count     = len(txs) - fraud_count
    avg_risk       = sum(t.fraud_score for t in txs) / len(txs)

    # Category spending breakdown
    cat_map: dict[str, float] = {}
    for t in txs:
        if t.amount < 0:
            cat_map[t.category] = cat_map.get(t.category, 0) + abs(t.amount)

    response = AnalyticsResponse(
        total_transactions=len(txs),
        total_spent=round(total_spent, 2),
        total_received=round(total_received, 2),
        fraud_count=fraud_count,
        safe_count=safe_count,
        risk_score=round(avg_risk, 4),
        category_breakdown={k: round(v, 2) for k, v in cat_map.items()},
    )

    # Update cache
    ANALYTICS_CACHE[user_id] = {"data": response, "timestamp": now}
    return response


# ─── Model Retraining (Admin) ─────────────────────────────────

@router.post(
    "/retrain",
    status_code=202,
    summary="Trigger model retraining based on user feedback",
)
def trigger_retrain(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Triggers a background task to retrain the ML model using 
    collected user feedback from the database.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    from ml.retrain_on_data import retrain_from_db
    background_tasks.add_task(retrain_from_db)
    
    return {"message": "Retraining task started in background."}
