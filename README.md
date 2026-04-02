# AI Portfolio Master Dashboard

This repository contains multiple AI tools/projects and a single **Master Dashboard** (`index.html`) that lets you open each tool from one place.

---

## What This Setup Does

- Runs all projects locally on fixed ports.
- Gives you one dashboard UI (`index.html`) with a sidebar + iframe.
- Lets you switch between tools without opening separate bookmarks for each project.

---

## Main Files

- `index.html`  
  Master Dashboard UI (single-site launcher view in browser).

- `launcher.js`  
  Starts all backend/frontend services for all tools.

---

## Current Port Pattern

- Backends: `5100+`
- Frontends: `3100+`

Example:
- `QR_code_generator` frontend: `http://localhost:3102/`
- `QR_code_generator` backend: `http://localhost:5106/`

---

## How To Run Everything (Recommended)

From the project root:

```powershell
cd C:\Portfolio
node launcher.js
```

Then open:

- `C:\Portfolio\index.html` in your browser  
  (or serve it with a simple static server if you prefer).

Keep the terminal with `node launcher.js` running while you use the dashboard.

---

## How To Add A New AI Tool To This One Site

Use this checklist every time:

1. **Add your project folder** in `C:\Portfolio`.
2. **Assign unique ports**:
   - backend: next free `51xx`
   - frontend: next free `31xx`
3. **Update the tool code** to use those ports:
   - backend app run port (`app.py`, `server.js`, etc.)
   - frontend API base URL to correct backend port
4. **Add startup entry in `launcher.js`**:
   - include backend start command
   - include frontend start command (if any)
5. **Add dashboard entry in `index.html`**:
   - add tool in the `projects` array
   - set `url` to the frontend URL (or backend URL for backend-only tools)
6. **Run and verify**:
   - `node launcher.js`
   - open dashboard and click your new tool

---

## If A Tool Does Not Open

Quick checks:

- Port conflict (two tools using same port).
- Tool dependencies not installed (`npm install` / `pip install -r requirements.txt`).
- Wrong API base URL in frontend (still pointing to old port like `5000`).
- Dev server not running (check launcher terminal logs).

---

## Manual Run (Single Tool)

If you want to run one tool only:

1. Start its backend in one terminal.
2. Start its frontend in another terminal (if it has one).
3. Open that tool URL directly.

---

## Notes

- Some tools are backend-only; some are full-stack.
- For iframe/dashboard stability, avoid auto-opening browser tabs from Vite (`--no-open` or `open: false`).
- Keep ports fixed once set, so dashboard links stay stable.

