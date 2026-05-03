# NeuroShield AI: Next-Gen Fraud Detection 🛡️🤖

**NeuroShield** is a full-stack, AI-powered fraud detection system designed to protect financial transactions in real-time. It combines a high-performance **FastAPI** backend with a modern **React Native** mobile application to provide "Zero-Day" fraud prevention and adaptive security.

---

## ✨ Key Features

### 🧠 AI & Machine Learning
- **Real-Time Anomaly Detection**: Uses an **Isolation Forest** model to analyze transactions in under 10ms.
- **Adaptive Feedback Loop**: Learns from user feedback to update model weights for personalized protection.
- **Risk Scoring**: Granular 0.0 – 1.0 scoring for every transaction.

### 📱 Mobile Experience (React Native)
- **Interactive Dashboard**: Live overview of protected balances and safety percentages.
- **Real-Time Alerts**: WebSocket integration for instant fraud notifications.
- **Automatic Metadata**: GPS location, device fingerprinting, and timestamp capture.
- **Receipt Scanning**: Digital record-keeping via image uploads.

### ⚙️ Backend & DevOps (FastAPI)
- **JWT Authentication**: Secure, token-based session management.
- **Enterprise Ready**: Razorpay webhook integration and Redis caching placeholders.
- **Dockerized**: Fully containerized with `docker-compose` for instant deployment.

---

## 🛠️ Tech Stack

- **Frontend**: React Native (Expo Router), Axios, React Native Chart Kit.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Pydantic v2.
- **ML Engine**: Scikit-Learn (Isolation Forest), Joblib.
- **Database**: SQLite (Development) / PostgreSQL Ready.
- **DevOps**: Docker, Docker Compose.

---

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*Backend will be live at `http://localhost:8000/docs`*

### 2. Start the Mobile App
```bash
cd frontend
npm install
npx expo start
```

### 🐳 Using Docker
```bash
docker-compose up --build
```

---

## 📂 Project Structure
- `/backend`: FastAPI service, ML models, and API routers.
- `/frontend`: Expo React Native app with Auth & WebSocket contexts.
- `docker-compose.yml`: Orchestration for the entire system.

---

## 🛡️ Security
- Industry-standard **Bcrypt** password hashing.
- **JWT** (JSON Web Tokens) for secure API communication.
- Role-based access control (Admin vs. User).

---
*Built with ❤️ for a safer financial future.*
