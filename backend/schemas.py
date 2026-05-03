from pydantic import BaseModel, EmailStr, field_validator, computed_field
from typing import Optional
from datetime import datetime


# ─────────────────────────── AUTH ────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# ─────────────────────────── USER ────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────── TRANSACTION ─────────────────────

class TransactionCheckRequest(BaseModel):
    """Payload sent by the mobile app to check a transaction for fraud."""
    amount: float
    category: str = "Shopping"
    location: str = "Unknown"
    time: str = ""
    device_model: str = "Unknown Device"
    os: str = "Unknown OS"
    note: str = ""
    merchant: str = "Unknown Merchant"


class TransactionCheckResponse(BaseModel):
    """Response returned after running fraud detection."""
    id: int
    is_fraud: bool
    fraud_score: float
    risk_label: str          # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    message: str


class TransactionFeedback(BaseModel):
    """User confirms whether a transaction was fraud or safe."""
    feedback: str            # "safe" | "fraud"


class TransactionResponse(BaseModel):
    id: int
    amount: float
    category: str
    location: str
    note: str
    device_model: str
    os: str
    time: str
    fraud_score: float
    is_fraud: bool
    user_feedback: Optional[str] = None
    receipt_image: Optional[str] = None
    merchant: str
    status: str
    group: str
    created_at: datetime

    # Derived fields for frontend compatibility
    @computed_field
    @property
    def safe(self) -> bool:
        return not self.is_fraud

    model_config = {"from_attributes": True}


class AnalyticsResponse(BaseModel):
    total_transactions: int
    total_spent: float
    total_received: float
    fraud_count: int
    safe_count: int
    risk_score: float         # 0.0 – 1.0
    category_breakdown: dict
