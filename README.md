# 🧵 ThreadCore — Scalable Thread Management Library
### CSE-316 CA2 Project | Title: Scalable Thread Management Library

---

## Project Structure

```
thread_mgmt/
├── backend/
│   ├── thread_library.py   ← Core Library (Module 1: Thread Engine)
│   └── app.py              ← Flask REST API (Module 2: API Layer)
├── frontend/
│   └── index.html          ← Dashboard UI (Module 3: Visualization)
├── requirements.txt
└── README.md
```

---

## ⚙️ Setup & Run (VS Code)

### Step 1 — Install Python dependencies
Open a terminal in VS Code (`Ctrl+`` `) and run:

```bash
cd thread_mgmt
pip install -r requirements.txt
```

### Step 2 — Start the Backend API
```bash
cd backend
python app.py
```
You should see:
```
🚀 Thread Management API running at http://localhost:5000
```

### Step 3 — Open the Frontend
Open `frontend/index.html` directly in your browser:
- Right-click → "Open with Live Server" (if you have the VS Code Live Server extension), **OR**
- Simply drag `frontend/index.html` into Chrome/Firefox

The dashboard will auto-connect to the backend at `localhost:5000`.

---

## Modules

### Module 1 — Thread Engine (`thread_library.py`)
Core library with:
- `ManagedThread` — Lifecycle-managed thread (create, pause, resume, terminate)
- `ThreadPool` — Scalable worker pool with priority queue
- `ThreadManager` — Central orchestrator for all threads
- `Barrier` — Synchronization primitive for multi-thread checkpoints
- `ReadWriteLock` — Readers-writer lock for shared resources

### Module 2 — REST API (`app.py`)
Flask server exposing:
| Endpoint | Method | Description |
|---|---|---|
| `/api/threads` | GET | List all threads + metrics |
| `/api/summary` | GET | Stats + event log |
| `/api/threads/create` | POST | Create & start a thread |
| `/api/threads/<id>/pause` | POST | Pause a thread |
| `/api/threads/<id>/resume` | POST | Resume a thread |
| `/api/threads/<id>/terminate` | POST | Kill a thread |
| `/api/threads/cleanup` | POST | Remove finished threads |
| `/api/pool/submit` | POST | Submit tasks to thread pool |
| `/api/pool/stats` | GET | Pool statistics |
| `/api/stress` | POST | Launch stress test (N threads) |

### Module 3 — Dashboard (`frontend/index.html`)
Real-time UI with:
- Live thread list with Pause / Resume / Terminate controls
- State distribution doughnut chart
- Running-threads-over-time line chart
- Thread pool stats panel
- Event log
- Create Thread form with priority slider
- Stress test launcher

---

## Technologies Used
- **Python 3.10+** — Core library & backend
- **Threading module** — Native OS thread management
- **Flask** — Lightweight REST API server
- **Flask-CORS** — Cross-origin request support
- **HTML5 / CSS3 / Vanilla JS** — Frontend dashboard
- **Chart.js** — Real-time data visualization
- **GitHub** — Version control (add your repo link)
