# 🤖 AI Resume Screener & Talent Matcher

A full-stack AI tool that ranks PDF resumes against job descriptions using NLP-powered semantic matching.

---

## ✨ Overview

**AI Resume Screener & Talent Matcher** helps recruiters quickly evaluate candidate fit by:
- parsing uploaded PDF resumes,
- comparing each resume against a pasted job description using a transformer model,
- returning ranked match scores,
- and surfacing analytics in a professional admin dashboard.

---

## 🧰 Tech Stack

### **Frontend**
- HTML5
- Tailwind CSS
- JavaScript (Vanilla)
- Chart.js

### **Backend**
- Flask (Python)
- SQLite

### **AI / NLP**
- Hugging Face model: `sentence-transformers/all-MiniLM-L6-v2`
- Via Sentence-Transformers

---

## 🚀 Key Features

- **📄 PDF Parsing**: Extracts text from uploaded resume PDFs.
- **🧠 Semantic Matching**: Uses transformer embeddings and cosine similarity for relevance scoring.
- **📊 Admin Analytics Dashboard**: Displays total scans, average score, score bins, and recent activity.
- **💾 Persistent History**: Stores scan outcomes in SQLite for durable analytics across restarts.

---

## ⚙️ Installation & Setup

> Run commands from the project root.

### 1) Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) Run the Flask app

```bash
python backend/app.py
```

App URLs:
- Recruiter Tool: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)
- Admin Dashboard: [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin)

---

## 🗂️ Project Structure

```text
Resume_Screener/
├─ backend/
│  ├─ app.py
│  ├─ database.py
│  ├─ requirements.txt
│  ├─ resume_data.db            # local runtime DB (gitignored)
│  ├─ models/
│  │  ├─ __init__.py
│  │  ├─ pdf_parser.py
│  │  ├─ similarity.py
│  │  └─ skills.py
│  └─ uploads/
│     └─ .gitkeep
├─ frontend/
│  ├─ index.html
│  ├─ admin.html
│  └─ assets/
│     ├─ css/
│     │  └─ style.css
│     └─ js/
│        ├─ api.js
│        └─ charts.js
├─ requirements.txt
├─ .gitignore
└─ README.md
```

---

## 🧭 Usage

### **Recruiter Tool (`/`)**
1. Paste the job description.
2. Upload one or more PDF resumes.
3. Click **Find Matches**.
4. Review ranked candidates by match score and extracted top skills.

### **Admin Dashboard (`/admin`)**
1. Open the dashboard view.
2. Monitor:
   - total resumes processed,
   - average match score,
   - AI model status,
   - score distribution chart,
   - recent scan activity.
3. Stats auto-refresh every 10 seconds.

---

## 🔐 Notes

- Uploaded resume files are stored temporarily under `backend/uploads/`.
- Runtime data is persisted in SQLite (`backend/resume_data.db`).
- The first semantic match request may take longer due to initial model warm-up/download.

---

## 📌 Future Improvements

- Add authentication and role-based access.
- Export analytics reports (CSV/PDF).
- Add advanced filtering and candidate search.
- Containerize with Docker for easier deployment.

