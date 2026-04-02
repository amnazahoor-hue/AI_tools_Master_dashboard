# Email No-Response Chaser

A professional follow-up assistant designed to reduce "nudge anxiety" after sending important emails.  
The system helps users decide **when** to follow up and provides AI-generated follow-up drafts in multiple tones.

## Project Overview

Email No-Response Chaser solves a common SaaS communication problem:
- You send an important message (job, client, or personal)
- You do not receive a reply
- You are unsure when or how to follow up

This project automates that workflow with category-aware scheduling and local AI generation.

## Tech Stack

- **Backend:** Flask, Flask-CORS, Flask-SQLAlchemy
- **Frontend:** HTML, Tailwind CSS, Vanilla JavaScript (React-style modular structure via reusable JS modules)
- **Database:** SQLite
- **AI Layer:** Hugging Face Transformers (`google/flan-t5-small`) + PyTorch local inference
- **Charts/Analytics UI:** Chart.js

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                            │
│  index.html | dashboard.html | admin.html | assets/js | assets/css │
│  - Input + Smart Paste                                              │
│  - User Dashboard + Draft Modal                                     │
│  - Admin Charts + System Health                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (Fetch API)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Flask API Layer                           │
│  app.py                                                              │
│  /api/users | /api/emails | /api/dashboard/:id | /api/admin/stats  │
│  /api/emails/:id/generate | /api/health                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ SQLite (flask-sqlalchemy)     │   │ NLP + Analytics Logic         │
│ users / emails / follow_ups   │   │ logic/nlp_engine.py           │
│                               │   │ logic/analytics.py            │
└───────────────────────────────┘   └───────────────────────────────┘
```

## System Workflow

1. **Input:** User pastes original email in `index.html`.
2. **Analysis:** Frontend keyword scoring detects category (`Job`, `Client`, `Personal`).
3. **Generation:** `nlp_engine.py` uses `google/flan-t5-small` to create 3 follow-up variants:
   - Casual
   - Value-Add
   - Professional
4. **Scheduling:** `analytics.py` computes suggested nudge date and priority using category windows.

## Project Workflow (End-to-End)

Paste -> Keyword Scoring -> T5 Inference -> Nudge Scheduling -> Dashboard Monitoring -> Admin Analytics

## Local Setup Guide

### Prerequisites

- Python 3.10+ recommended
- Internet only needed for first model download (cached locally afterward)

### Step 1: Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Run Flask API

```bash
python app.py
```

By default, API runs at:
- `http://127.0.0.1:5000`

### Step 3: Open frontend

Open these files in a browser from the `frontend` folder:
- `index.html` (Landing + Input Engine)
- `dashboard.html` (User Control Center)
- `admin.html` (Executive Analytics View)

## AI Model Details

The app uses **`google/flan-t5-small`** (instruction-tuned T5) through the Hugging Face `transformers` pipeline:

- Model type: Seq2Seq text generation
- Runtime: Local Python process via PyTorch
- Input: Original outbound email text + tone-specific prompt
- Output: 3 tailored follow-up drafts (Casual, Value-Add, Professional)

Why this model for this product:
- Lightweight enough for local development machines
- Good instruction-following behavior for email rewriting tasks
- Zero recurring API cost once dependencies are installed

## Privacy Note

AI processing is **local** to your machine.  
No email content is sent to OpenAI or third-party paid inference APIs by this project.

## Folder Structure

```text
email_chaser_pro/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── requirements.txt
│   └── logic/
│       ├── analytics.py
│       └── nlp_engine.py
└── frontend/
    ├── index.html
    ├── dashboard.html
    ├── admin.html
    └── assets/
        ├── css/
        │   └── style.css
        └── js/
            ├── api.js
            ├── ui.js
            └── charts.js
```

## Notes for Production Hardening

- Add authentication/authorization (JWT/session)
- Add background job queue for generation workloads
- Add DB migrations (Alembic)
- Add rate limits and request logging
- Serve frontend through Flask/static server instead of file URLs
