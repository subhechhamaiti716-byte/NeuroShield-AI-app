"""
NeuroShield Retraining Script
-----------------------------
Pulls transactions with user feedback from the database and retrains 
the model to improve accuracy over time using Isolation Forest.
"""

import os
import sys
import joblib
import numpy as np
from sqlalchemy.orm import Session
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Transaction
from ml.fraud_detector import _build_features

def retrain_from_db():
    db: Session = SessionLocal()
    try:
        # Get all transactions that have user feedback
        txs = db.query(Transaction).filter(Transaction.user_feedback.isnot(None)).all()
        
        if len(txs) < 10:
            print(f"Not enough data to retrain (need at least 10 feedback points, got {len(txs)}).")
            return

        print(f"Retraining model on {len(txs)} real user feedback points...")

        X = []
        for tx in txs:
            # Reconstruct features
            features = _build_features(
                tx.amount, 
                tx.time, 
                tx.category, 
                tx.location
            )
            X.append(features)

        X = np.array(X, dtype=float)

        # Retraining logic with Isolation Forest
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        clf = IsolationForest(
            n_estimators=100,
            contamination=0.1,  # Assume 10% outliers
            random_state=42
        )
        clf.fit(X_scaled)

        # Save updated model
        model_data = {
            "scaler": scaler,
            "classifier": clf,
            "feature_names": ["amount", "hour", "category_enc", "loc_risk", "night_device"],
            "version": "1.2.0-isolation-forest",
            "samples_count": len(txs)
        }

        out_path = os.path.join(os.path.dirname(__file__), "fraud_model.pkl")
        joblib.dump(model_data, out_path)
        print(f"Model successfully updated (Isolation Forest) and saved to {out_path}")

    finally:
        db.close()

if __name__ == "__main__":
    retrain_from_db()
