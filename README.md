# NeuroShield AI: Next-Gen Fraud Detection 🛡️🤖

**NeuroShield** is a full-stack, enterprise-grade AI fraud detection ecosystem. It leverages real-time anomaly detection, advanced infrastructure monitoring, and high-performance caching to protect financial transactions globally.

---

## 🚀 Live Deployment
- **Frontend (Web)**: [neuroshield-ai-app.vercel.app](https://neuroshield-ai-app.vercel.app) 🌐
- **Backend (API)**: [neuroshield-ai-app.onrender.com](https://neuroshield-ai-app.onrender.com) 🛡️
- **Mobile (Android)**: [Download Latest APK](https://expo.dev/artifacts/eas/aVrkjx7CR4X5bi751rrCa.apk) 📱

---

## ✨ Key Features

### 🧠 Intelligence & Performance
- **Isolation Forest ML**: Real-time transaction scoring in <15ms. ✅
- **Server-Side Pagination**: Scalable transaction history for millions of records. ✅
- **TTL Caching**: Analytics dashboard data cached for 5 mins to ensure lightning speed. ✅
- **Network Optimization**: GZip compression reduces data transfer by ~70%. ✅

### 📱 Mobile Experience
- **Full-Text Search**: Instantly find transactions by Merchant, Category, or Note. 🔍
- **Real-Time Alerts**: Instant fraud notifications via WebSockets. 🔔
- **File Storage**: Upload and manage transaction receipts with visual indicators. 📄
- **Advanced Analytics**: Detailed spending breakdown and security health scores. 📈

### 🛡️ Enterprise Infrastructure
- **System Monitoring**: Dedicated `/monitoring/status` dashboard for Uptime and Health. 📊
- **Database Indexing**: Optimized SQL queries for high-speed data retrieval. ⚡
- **JWT Security**: Secure session management with industry-standard encryption. 🔐
- **Background Jobs**: Asynchronous ML model retraining using FastAPI BackgroundTasks. ⚙️

---

## 🛠️ Tech Stack
- **Frontend**: React Native (Expo Router), TypeScript, Axios.
- **Backend**: FastAPI, SQLAlchemy (PostgreSQL/SQLite).
- **Machine Learning**: Scikit-Learn, Joblib, NumPy.
- **Hosting**: Render (Backend), Vercel (Frontend), Expo (Mobile).

---

## 📂 Project Structure
- `/backend`: FastAPI service, ML inference logic, and Monitoring routers.
- `/frontend`: Expo React Native app with tab-based navigation.
- `/docs`: API Postman collections and architecture diagrams.

---

## 🔧 Installation & Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Mobile App
```bash
cd frontend
npm install
npx expo start
```

### Mobile Build (APK)
```bash
npx eas-cli build --platform android --profile preview
```

---
*Built for a safer, AI-driven financial future.* 🛡️💎
