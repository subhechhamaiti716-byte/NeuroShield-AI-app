from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Core transaction fields
    amount = Column(Float, nullable=False)
    category = Column(String, default="Shopping")
    location = Column(String, default="Unknown")
    note = Column(Text, default="")

    # Device metadata (for ML feature engineering)
    device_model = Column(String, default="Unknown Device")
    os = Column(String, default="Unknown OS")
    time = Column(String, default="")  # HH:MM format

    # Fraud detection results
    fraud_score = Column(Float, default=0.0)
    is_fraud = Column(Boolean, default=False)
    user_feedback = Column(String, nullable=True)  # "safe" | "fraud" | None
    receipt_image = Column(String, nullable=True)  # Path to receipt image

    # Status
    merchant = Column(String, default="Unknown Merchant")
    status = Column(String, default="Completed")  # "Completed" | "Action Required"
    group = Column(String, default="TODAY")        # "TODAY" | "YESTERDAY" | date string

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    owner = relationship("User", back_populates="transactions")
