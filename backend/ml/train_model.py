"""
NeuroShield Fraud Detection Model
----------------------------------
Trains an IsolationForest + RandomForest ensemble on synthetic data and saves
the pipeline as `fraud_model.pkl` in the ml/ directory.

Run once:  python ml/train_model.py
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline

# ─── Reproducibility ─────────────────────────────────────────
np.random.seed(42)

N_NORMAL = 5000
N_FRAUD  = 500   # ~9% fraud rate — realistic imbalance

# ─── Feature columns (must match fraud_detector.py) ──────────
# [amount, hour, category_enc, is_high_risk_location, is_foreign_device]

CATEGORIES = ["Shopping", "Food & Drink", "Electronics", "Travel",
               "Entertainment", "Transport", "Income", "Other"]

HIGH_RISK_KEYWORDS = ["unknown", "unavailable", "denied", "lat:", "0.0000"]

def encode_category(cat: str) -> float:
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

def location_risk(loc: str) -> float:
    loc_lower = loc.lower()
    for kw in HIGH_RISK_KEYWORDS:
        if kw in loc_lower:
            return 1.0
    return 0.0


def generate_features(amount, hour, category, location, is_night_device=False):
    return [
        amount,
        hour,
        encode_category(category),
        location_risk(location),
        float(is_night_device),
    ]


# ─── Generate synthetic training data ────────────────────────

def generate_dataset():
    X, y = [], []

    # Normal transactions
    for _ in range(N_NORMAL):
        amount   = np.random.lognormal(mean=4.0, sigma=1.2)   # ~$55 median
        hour     = np.random.randint(7, 22)                    # daytime
        cat      = np.random.choice(CATEGORIES)
        location = "New York, US"
        X.append(generate_features(amount, hour, cat, location, False))
        y.append(0)

    # Fraudulent transactions
    for _ in range(N_FRAUD):
        pattern = np.random.choice(["high_amount", "night", "unknown_loc", "foreign"])

        if pattern == "high_amount":
            amount   = np.random.uniform(2000, 15000)
            hour     = np.random.randint(0, 6)
            cat      = np.random.choice(["Electronics", "Travel"])
            location = "Unknown"
        elif pattern == "night":
            amount   = np.random.uniform(500, 5000)
            hour     = np.random.randint(0, 5)
            cat      = np.random.choice(["Electronics", "Other"])
            location = "Lat: 0.0000, Lon: 0.0000"
        elif pattern == "unknown_loc":
            amount   = np.random.uniform(100, 8000)
            hour     = np.random.randint(0, 24)
            cat      = "Electronics"
            location = "Location unavailable"
        else:  # foreign
            amount   = np.random.uniform(300, 6000)
            hour     = np.random.randint(0, 24)
            cat      = np.random.choice(["Travel", "Shopping"])
            location = "Unknown"

        X.append(generate_features(amount, hour, cat, location, hour < 6))
        y.append(1)

    return np.array(X, dtype=float), np.array(y, dtype=int)


# ─── Train & Save ─────────────────────────────────────────────

def train():
    print("Generating synthetic fraud dataset ...")
    X, y = generate_dataset()

    print(f"  Normal: {(y==0).sum()}  |  Fraud: {(y==1).sum()}")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_scaled, y)

    model_data = {
        "scaler": scaler,
        "classifier": clf,
        "feature_names": ["amount", "hour", "category_enc", "loc_risk", "night_device"],
        "version": "1.0.0",
    }

    out_path = os.path.join(os.path.dirname(__file__), "fraud_model.pkl")
    joblib.dump(model_data, out_path)
    print(f"Model saved -> {out_path}")

    # Quick accuracy check
    preds = clf.predict(X_scaled)
    correct = (preds == y).mean()
    print(f"Training accuracy: {correct:.1%} (overfitted - for demo purposes)")


if __name__ == "__main__":
    train()
