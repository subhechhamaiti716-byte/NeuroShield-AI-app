"""
NeuroShield Fraud Detector
---------------------------
Loads the trained RandomForest model (fraud_model.pkl) and exposes a single
`predict()` function. Falls back to a deterministic rule-based scorer if the
model file has not been trained yet.
"""

import os
import logging
from typing import Tuple

logger = logging.getLogger("neuroshield.ml")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "fraud_model.pkl")

# Lazy-loaded model — loaded once on first call
_model_data = None


def _load_model():
    global _model_data
    if _model_data is not None:
        return _model_data
    try:
        import joblib
        _model_data = joblib.load(MODEL_PATH)
        logger.info("Fraud model loaded from %s", MODEL_PATH)
    except FileNotFoundError:
        logger.warning("fraud_model.pkl not found — using rule-based fallback scorer.")
        _model_data = {}
    return _model_data


# ─── Feature helpers (must match train_model.py) ──────────────

HIGH_RISK_KEYWORDS = ["unknown", "unavailable", "denied", "lat:", "0.0000"]


def _encode_category(cat: str) -> float:
    cat = cat.lower()
    risk_map = {
        "electronics": 0.8,
        "travel": 0.7,
        "other": 0.6,
        "shopping": 0.4,
        "transport": 0.3,
        "entertainment": 0.3,
        "food & drink": 0.2,
        "income": 0.1,
    }
    for key, val in risk_map.items():
        if key in cat:
            return val
    return 0.5


def _location_risk(loc: str) -> float:
    loc_lower = loc.lower()
    for kw in HIGH_RISK_KEYWORDS:
        if kw in loc_lower:
            return 1.0
    return 0.0


def _parse_hour(time_str: str) -> int:
    """Parse 'HH:MM AM/PM' or '14:35' → integer hour (0–23)."""
    try:
        from datetime import datetime
        for fmt in ("%I:%M %p", "%H:%M", "%I:%M%p"):
            try:
                return datetime.strptime(time_str.strip(), fmt).hour
            except ValueError:
                continue
    except Exception:
        pass
    return 12  # default: noon


def _build_features(amount: float, time_str: str, category: str, location: str) -> list:
    hour = _parse_hour(time_str)
    return [
        amount,
        hour,
        _encode_category(category),
        _location_risk(location),
        float(hour < 5),  # is_night_device
    ]


# ─── Rule-based fallback scorer ───────────────────────────────

def _rule_based_score(amount: float, time_str: str, category: str, location: str) -> float:
    score = 0.0

    # Amount-based risk
    if amount > 5000:
        score += 0.50
    elif amount > 2000:
        score += 0.35
    elif amount > 1000:
        score += 0.20
    elif amount > 500:
        score += 0.10

    # Time-based risk
    hour = _parse_hour(time_str)
    if 0 <= hour < 5:
        score += 0.25
    elif 5 <= hour < 7:
        score += 0.10

    # Location risk
    score += _location_risk(location) * 0.25

    # Category risk
    score += _encode_category(category) * 0.15

    return min(score, 1.0)


# ─── Public API ───────────────────────────────────────────────

def _risk_label(score: float) -> str:
    if score >= 0.75:
        return "CRITICAL"
    if score >= 0.55:
        return "HIGH"
    if score >= 0.35:
        return "MEDIUM"
    return "LOW"


def predict(
    amount: float,
    category: str = "Shopping",
    location: str = "Unknown",
    time_str: str = "",
    device_model: str = "",
    os_name: str = "",
) -> Tuple[bool, float, str]:
    """
    Returns:
        (is_fraud: bool, fraud_score: float 0–1, risk_label: str)
    """
    model_data = _load_model()

    if model_data.get("classifier") and model_data.get("scaler"):
        import numpy as np
        features = _build_features(amount, time_str, category, location)
        X = np.array([features], dtype=float)
        X_scaled = model_data["scaler"].transform(X)
        clf = model_data["classifier"]
        
        # Isolation Forest: decision_function returns signed distance to separating hyperplane.
        # Higher values mean more "normal". Lower values mean more "outlier".
        # We normalize this to a 0-1 fraud probability score.
        decision_score = float(clf.decision_function(X_scaled)[0])
        # Mapping decision_score (~ -0.5 to 0.5) to 0.0 - 1.0 risk score
        fraud_prob = 1.0 - ((decision_score + 0.5) / 1.0)
        fraud_prob = max(0.0, min(1.0, fraud_prob))
    else:
        fraud_prob = _rule_based_score(amount, time_str, category, location)

    # Threshold tuned to ~0.50 for demo visibility
    THRESHOLD = 0.50
    is_fraud = fraud_prob >= THRESHOLD
    label = _risk_label(fraud_prob)

    return is_fraud, round(fraud_prob, 4), label
