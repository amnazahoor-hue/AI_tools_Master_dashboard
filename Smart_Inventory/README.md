# VisionInventory Pro

AI-powered inventory workspace for product analysis, catalog generation, social copywriting, and visual post creation.

## Overview

VisionInventory Pro is a full-stack SaaS-style application that helps teams:

- Upload product images (file upload or webcam snapshot)
- Run AI image analysis and auto-categorization
- Edit and save inventory records
- Manage inventory in an admin dashboard
- Generate social captions for Instagram, X, and LinkedIn
- Generate branded, ready-to-post PNG creatives

---

## Tech Stack

### Backend

- Python
- Flask + Flask-CORS
- SQLite
- Transformers + Torch (BLIP captioning)
- Pillow (image composition and post generation)

### Frontend

- React (Vite)
- Tailwind CSS
- Framer Motion
- React Hot Toast
- React Dropzone
- React Webcam
- Lucide React

---

## Project Structure

```text
Smart_Inventory/
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── marketing_kit.py
│   ├── models.py
│   ├── nlp_engine.py
│   ├── requirements.txt
│   ├── vision_inventory.db
│   └── uploads/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── components/
│       │   └── SocialKitDrawer.jsx
│       ├── context/
│       │   └── AppContext.jsx
│       ├── hooks/
│       │   └── useApi.js
│       └── pages/
│           ├── AdminView.jsx
│           └── Dashboard.jsx
└── README.md
```

---

## Features

### 1) AI Product Analysis

- Upload product image from local device or webcam
- BLIP-based caption generation
- Category assignment from caption keywords
- SEO title generation
- Price range estimation
- Tags and marketing description generation

### 2) Inventory Management

- Save products with status (`Draft`, `Active`, `Archived`)
- Search and filter products by category and keyword
- Bulk mark active
- Bulk delete
- Export filtered inventory to CSV

### 3) Social Marketing Kit

- Generate platform-ready post copy:
  - Instagram
  - X (Twitter)
  - LinkedIn
- One-click copy with toast feedback

### 4) Visual Post Creator

- Generates branded square post image (1080x1080)
- Uses original product image + styled overlays
- Includes title, promo ribbon, price badge, watermark
- Downloadable PNG from the Social Kit drawer

---

## Database Schema

### `products`

- `id` (INTEGER, PK)
- `name` (TEXT, required)
- `original_image_path` (TEXT, required)
- `ai_caption` (TEXT)
- `tags` (TEXT)
- `marketing_description` (TEXT)
- `category` (TEXT)
- `suggested_price` (REAL)
- `status` (`Draft`/`Active`/`Archived`)
- `created_at` (TEXT timestamp)

### `settings`

- `id` (INTEGER, fixed to `1`)
- `currency_symbol` (TEXT)
- `default_tax_rate` (REAL)
- `updated_at` (TEXT timestamp)

---

## API Endpoints

Base URL: `http://127.0.0.1:8000`

### Health

- `GET /api/health`

### Products

- `POST /api/products/analyze` - upload image + generate AI result
- `POST /api/products` - save product
- `GET /api/products` - list/search/filter products
- `PATCH /api/products/<id>` - update product
- `DELETE /api/products/<id>` - delete single product

### Bulk Operations

- `POST /api/products/bulk/mark-active`
- `POST /api/products/bulk/delete`

### Export

- `GET /api/products/export/csv`

### Settings

- `GET /api/settings`
- `PUT /api/settings`

### Marketing Kit

- `POST /api/products/<id>/social-kit`
- `GET /api/products/<id>/generate-image`

### Static Uploads

- `GET /uploads/<filename>`

---

## Local Setup

## 1) Backend

```powershell
cd "c:\New folder\Smart_Inventory"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r "backend\requirements.txt"
python "backend\app.py"
```

Backend runs on:

- `http://127.0.0.1:8000`

> Note: First AI run may take longer while model assets are downloaded.

## 2) Frontend

Open a new terminal:

```powershell
cd "c:\New folder\Smart_Inventory\frontend"
npm install
npm run dev
```

Frontend runs on:

- `http://127.0.0.1:5173`

---

## Usage Flow

1. Open the app and go to **Dashboard**
2. Upload product image (or use webcam)
3. Review AI-generated details in **Quick Edit**
4. Confirm and save to inventory
5. Go to **Admin Control Center** for search/filter/bulk actions
6. Use **Social Kit** to generate captions and a visual post
7. Download PNG and publish

---

## Troubleshooting

### PowerShell execution policy issue

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### AI caption generation fails

- Ensure backend dependencies are installed correctly
- Check internet access for model download
- Retry with a clearer image if blur detection rejects input

### Visual post generation fails

- Ensure the product has a valid `original_image_path`
- Verify image file still exists in `backend/uploads/`

---

## Brand

- Product: **VisionInventory Pro**
- Tagline watermark: **Powered by Tekcroft**

