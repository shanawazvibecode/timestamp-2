# SyncForge Studio ⚡🎬

**SyncForge Studio** is a flagship, production-ready, cross-platform desktop and web application designed for video editors working with long-form audio and video (1-hour+ podcasts, video essays, documentaries, interviews).

It transcribes speech with word-level precision using local **`faster-whisper`**, merges subtitles into logical **5-to-12-second visual scenes**, and generates:
1. **Final Cut Pro 7 XMEML v4 Timeline (`.xml`)**: Compatible natively with **Adobe Premiere Pro**, **DaVinci Resolve**, and **Final Cut Pro**, pre-placing `scene_001.png`, `scene_002.png`, etc., at exact frame intervals and timecodes.
2. **SubRip Subtitles (`.srt`)**: Standard, timecode-accurate subtitle file for YouTube, VLC, or video editors.
3. **AI Scene & Image Prompt Manifests (`.json`, `.csv`, `.xml`)**: Formatted with spoken transcript, timecodes, duration, and AI prompts ready for Midjourney, Flux, Stable Diffusion, or DALL-E.
4. **Google Gemini Integration (Optional)**: If you provide your Gemini API key, it generates custom cinematic prompts tailored to your Master Visual Style; if left blank, it creates structured prompts using an intelligent offline template engine.

---

## 🏗️ Architecture

```
                               ┌────────────────────────────────┐
                               │       SyncForge Studio         │
                               │   http://localhost:5173        │
                               └───────────────┬────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
            ┌──────────────────────┐                       ┌──────────────────────┐
            │   Web Browser Mode   │                       │ Electron Desktop App │
            │ Chrome / Safari / Edge│                       │  macOS & Windows     │
            └──────────┬───────────┘                       └───────────┬──────────┘
                       │                                               │
                       │             HTTP REST & SSE                   │
                       └───────────────────────┬───────────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │     FastAPI Python Backend     │
                               │     http://127.0.0.1:8000      │
                               └───────────────┬────────────────┘
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     ▼                         ▼                         ▼
             [ Audio Extractor ]      [ faster-whisper ]        [ Scene Grouper ]
             System FFmpeg probe       Local transcription      Pacing-aware 3-15s
                     │                         │                         │
                     └─────────────────────────┼─────────────────────────┘
                                               ▼
                               ┌────────────────────────────────┐
                               │  Export Engines                │
                               │  • FCP7 XMEML v4 XML           │
                               │  • Standard .SRT Subtitles     │
                               │  • JSON & CSV Prompt Sheets    │
                               │  • AI Prompt Manifest XML      │
                               └────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18 or newer
- **Python**: 3.10 or 3.11 (Python 3.11 recommended for `faster-whisper`)
- **FFmpeg**: Installed and accessible in your system `PATH` (Verify with `ffmpeg -version`)

---

### Option A: Running in Web Browser Mode (`localhost:5173`)

1. **Start the Python Backend:**
   - **Windows:**
     ```powershell
     .\backend_venv\Scripts\python.exe -m uvicorn backend.app:app --port 8000
     ```
   - **macOS / Linux:**
     ```bash
     ./backend_venv/bin/python -m uvicorn backend.app:app --port 8000
     ```

2. **Start the Frontend Dev Server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. Open **`http://localhost:5173`** in Chrome, Safari, Edge, or Brave.

---

### Option B: Running as an Electron Desktop App

1. Ensure the frontend is built or the dev server is running:
   ```bash
   cd frontend
   npm run build
   ```

2. Start the Electron wrapper (which automatically spawns the Python backend as a child process and handles graceful shutdown upon quitting):
   ```bash
   cd electron
   npm start
   ```

---

## 🎛️ Features & Settings

- **Scene Pacing Selector:**
  - **Fast Pacing (3–6s per image):** Ideal for TikToks, YouTube Shorts, dynamic reels.
  - **Balanced Story (6–10s per image):** Standard for video essays, tutorials, podcasts.
  - **Relaxed Documentary (10–15s per image):** Cinematic long-form takes.
- **Timeline FPS Selection:** Select `24 fps`, `25 fps`, `30 fps`, or `60 fps` to match your video editing sequence.
- **Live Real-Time Streaming:** Uses Server-Sent Events (SSE) on `/api/progress/{job_id}`:
  - *Stage 1 (0%–15%):* Media stream validation and FFmpeg audio extraction.
  - *Stage 2 (15%–80%):* Dynamic `faster-whisper` transcription showing live audio timestamp progress.
  - *Stage 3 (80%–100%):* Intelligent scene segmentation, Gemini prompt enrichment, and file rendering.
- **One-Click Exports:**
  - Standard `.srt` file.
  - Final Cut Pro 7 XML timeline ready for Premiere Pro & DaVinci Resolve import.
  - AI Prompt Manifest `.xml`.
  - Scene prompt sheets in `.json` and `.csv`.
  - 1-Click "Copy All Prompts for AI" for Midjourney batch generation.

---

## 📁 Project Structure

```
.
├── backend/
│   ├── app.py                 # FastAPI application & SSE endpoints
│   ├── config.py              # Cross-platform pathlib directory configuration
│   ├── audio_extractor.py     # FFmpeg audio extraction & duration detection
│   ├── transcriber.py         # faster-whisper engine with progress callbacks
│   ├── scene_grouper.py       # Pacing-based scene segmentation algorithm
│   ├── xml_generator.py       # FCP7 XMEML v4 timeline generator (Premiere/DaVinci)
│   ├── srt_generator.py       # SubRip .srt subtitle generator
│   ├── prompt_enhancer.py     # Gemini API integration & template prompt generator
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # HeroDropzone, SettingsBar, LiveProgressCard, ActionHub, SceneTable
│   │   ├── utils/             # api.js (SSE listener), formatters.js
│   │   ├── App.jsx            # Main view
│   │   └── index.css          # Tailwind CSS & glassmorphic styling
│   ├── vite.config.js         # Port 5173 with proxy to backend :8000
│   └── package.json
├── electron/
│   ├── main.js                # OS detection, child process lifecycle, desktop window
│   ├── preload.js             # Context bridge
│   └── package.json
└── README.md
```
