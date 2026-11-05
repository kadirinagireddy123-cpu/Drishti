# Drishti: Voice & Vision AI (Team Tech Trojan, Celestia Hackathon)

    Drishti/
      backend/   Python FastAPI + Gemini  (port 5000)
      frontend/  React 19 + TypeScript + Vite + Tailwind  (port 5173)

## Run
    cd backend && pip install -r requirements.txt && cp .env.example .env && python main.py
    cd frontend && npm install && npm run dev

The Vite dev proxy points to http://localhost:5000 (the backend default). With no GEMINI_API_KEY the backend runs in demo mode.

## Not included in this zip yet
- backend/src/ (app.py, config/env.py, routes, Gemini service): main.py and server.py import it
- frontend/src/ (main.tsx, App.tsx, components, hooks, lib, config.ts): index.html loads /src/main.tsx
Copy these folders in from your project before running.
