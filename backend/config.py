import os
from pathlib import Path

# Base directories using pathlib for cross-platform compatibility (macOS & Windows)
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
TEMP_DIR = BASE_DIR / "temp"

# Ensure directories exist
for directory in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Pacing duration targets in seconds: (min_duration, max_duration)
PACING_PROFILES = {
    "fast": {"min": 3.0, "target": 4.5, "max": 6.0, "label": "Fast Pacing (3-6s per image)"},
    "balanced": {"min": 6.0, "target": 8.0, "max": 10.0, "label": "Balanced Story (6-10s per image)"},
    "relaxed": {"min": 10.0, "target": 12.5, "max": 15.0, "label": "Relaxed Documentary (10-15s per image)"}
}

DEFAULT_FPS = 24
DEFAULT_PACING = "balanced"
DEFAULT_WHISPER_MODEL = "base"
