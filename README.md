# Scalable Thread Library Management System

## Folder Structure

```text
scalable-thread-library/
├── backend/
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── index.js
│       └── services/
│           └── threadSystem.js
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── utils/
├── package.json
└── .gitignore
```

## Run Project

### 1. Install dependencies

```bash
npm install
npm run install:all
```

### 2. Start backend and frontend

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Production Build

```bash
npm run build
npm start
```

## Python API Additions

The Flask demo API in [app.py](/C:/Users/Pawan/OneDrive/Documents/scalable-thread-library/app.py) now supports:

- Dynamic thread-pool resizing with `POST /api/pool/config`
- Timeout-aware pool submissions with `POST /api/pool/submit` and `timeout_seconds`
- Stress launch profiles with `POST /api/stress` using `profile=medium` for 20 threads or `profile=high` for 30 threads
