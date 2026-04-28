# Adventurers AI Service

Python FastAPI microservice for image validation and progress scoring.

## Setup

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `GET /health` — Health check
- `POST /analyze-proof` — Validate a proof image upload
- `POST /score-progress` — Calculate weighted progress score
