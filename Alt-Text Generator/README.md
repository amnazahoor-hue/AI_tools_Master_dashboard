# Smart Image SEO Generator

A professional starter project that uses:

- **Backend:** Flask + Hugging Face BLIP captioning model
- **Frontend:** React (Vite) + Tailwind CSS + Axios
- **Goal:** Upload an image and generate:
  - AI alt-text
  - 5 SEO keywords

## Project Structure

```text
Alt-Text Generator/
├── backend/
│   ├── app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 1) Backend Setup (Python + Flask)

Open PowerShell in the project root:

```powershell
cd "c:\New folder\Alt-Text Generator"
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
pip install -r backend\requirements.txt
```

Run Flask backend:

```powershell
python backend\app.py
```

Backend runs at: `http://127.0.0.1:5000`

## 2) Frontend Setup (React + Vite + Tailwind)

Open a **second** PowerShell terminal:

```powershell
cd "c:\New folder\Alt-Text Generator\frontend"
```

Install npm dependencies:

```powershell
npm install
```

Run Vite development server:

```powershell
npm run dev
```

Frontend runs at: `http://localhost:5173`

## 3) Run Both Servers at the Same Time

Use **two terminals**:

- Terminal 1 (backend):
  - Activate venv
  - `python backend\app.py`
- Terminal 2 (frontend):
  - `cd frontend`
  - `npm run dev`

## 4) API Details

### Endpoint

- `POST /analyze`

### Request

- Content type: `multipart/form-data`
- Field name: `image`

### Response (success)

```json
{
  "alt_text": "a person riding a bicycle on a city street",
  "keywords": ["person", "riding", "bicycle", "city", "street"]
}
```

## 5) Environment Variable (Optional)

Frontend supports a custom backend URL using:

- `VITE_API_BASE_URL`

Create `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

## 6) Key Libraries

### Backend

- `flask`
- `flask-cors`
- `transformers`
- `torch`
- `Pillow`

### Frontend

- `react`
- `vite`
- `axios`
- `tailwindcss`
- `@tailwindcss/vite`

## Notes

- The BLIP model is loaded on **CPU** by design to keep memory usage manageable.
- First backend startup may take longer while model files are downloaded.
- CORS is configured to allow requests from `http://localhost:5173`.
