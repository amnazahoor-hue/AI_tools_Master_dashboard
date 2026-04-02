# Automated Article + Image Generation System

This project is a full-stack starter for generating:
- long-form articles from user prompts
- related AI-generated images from article content

It uses:
- **Frontend**: Next.js (React, App Router, TypeScript)
- **Backend**: Flask (Python)
- **Models**: Hugging Face `transformers` (text) + `diffusers` (image)

## Project Structure

```text
Text-to-Image-generator/
  backend/
    app.py
    requirements.txt
    .env.example
    services/
      generator.py
  frontend/
    app/
      layout.tsx
      page.tsx
      globals.css
    package.json
    tsconfig.json
    next.config.js
    .env.local.example
```

## Backend Setup (Flask)

1. Create and activate a virtual environment:
   - Windows PowerShell:
     ```powershell
     cd backend
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
3. Configure env:
   ```powershell
   copy .env.example .env
   ```
4. Run backend:
   ```powershell
   python app.py
   ```

Backend runs on `http://127.0.0.1:5000`.

## Frontend Setup (Next.js)

1. Install dependencies:
   ```powershell
   cd frontend
   npm install
   ```
2. Configure env:
   ```powershell
   copy .env.local.example .env.local
   ```
3. Run frontend:
   ```powershell
   npm run dev
   ```

Frontend runs on `http://localhost:3000`.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/generate/text` - Generate article from prompt
  - Body: `{ "prompt": "..." }`
- `POST /api/generate/images` - Generate images from text
  - Body: `{ "text": "...", "count": 1 }`
- `POST /api/feedback` - Save user feedback
  - Body: `{ "rating": 1-5, "comments": "..." }`

## Key Features Included

- Prompt-based article generation with basic prompt engineering
- Image generation using Stable Diffusion pipeline
- Multiple image support (`count` 1-4)
- Frontend flow that chains text generation then image generation
- Feedback form (rating + comments)
- Error handling on frontend and backend
- Graceful degradation toggles:
  - `ENABLE_TEXT_GENERATION`
  - `ENABLE_IMAGE_GENERATION`
- Basic security controls:
  - CORS restricted to frontend origin
  - Request rate limiting (`Flask-Limiter`)
  - Input validation on API payloads
- Error logging with rotating log files in `backend/logs`

## Dependency Management Notes

- Python dependencies are centralized in `backend/requirements.txt`
- JS dependencies are centralized in `frontend/package.json`
- Pin exact versions later for production reproducibility

## Production Notes

- Use stronger model serving setup (GPU instances, async jobs, queueing)
- Add auth, abuse prevention, and content moderation
- Persist feedback in a database (currently logged)
- Consider summarization/keyword extraction before image prompting
