import csv
import json
from pathlib import Path
from typing import List, Dict, Any
from backend.config import PACING_PROFILES


def format_seconds_display(seconds: float) -> str:
    """Format seconds into HH:MM:SS.mmm for display."""
    if seconds < 0:
        seconds = 0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        millis = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"


def group_segments_into_scenes(
    raw_segments: List[Dict[str, Any]],
    pacing: str = "balanced"
) -> List[Dict[str, Any]]:
    """
    Groups granular subtitle segments or words into logical visual scenes
    according to chosen pacing profile (fast, balanced, relaxed).
    """
    profile = PACING_PROFILES.get(pacing, PACING_PROFILES["balanced"])
    min_dur = profile["min"]
    target_dur = profile["target"]
    max_dur = profile["max"]

    if not raw_segments:
        # Create a graceful default scene for instrumental / ambient audio
        return [{
            "index": 1,
            "image_filename": "scene_001.png",
            "start": 0.0,
            "end": 6.0,
            "duration": 6.0,
            "start_formatted": "00:00:00.000",
            "end_formatted": "00:00:06.000",
            "text": "[Ambient / Instrumental track]",
            "prompt": ""
        }]

    scenes: List[Dict[str, Any]] = []
    
    current_chunk: List[Dict[str, Any]] = []
    current_start = raw_segments[0].get("start", 0.0)

    for i, seg in enumerate(raw_segments):
        current_chunk.append(seg)
        seg_start = seg.get("start", 0.0)
        seg_end = seg.get("end", seg_start)
        seg_text = seg.get("text", "").strip()
        
        current_dur = seg_end - current_start
        
        # Check if segment ends with punctuation
        has_punctuation = any(seg_text.endswith(p) for p in [".", "!", "?", "...", ":"])
        
        # Check pause to next segment if available
        has_pause = False
        if i + 1 < len(raw_segments):
            next_start = raw_segments[i + 1].get("start", seg_end)
            if next_start - seg_end >= 0.8:
                has_pause = True

        # Decide whether to close this scene
        should_split = False
        if current_dur >= max_dur:
            should_split = True
        elif current_dur >= target_dur and (has_punctuation or has_pause):
            should_split = True
        elif current_dur >= min_dur and has_pause:
            should_split = True

        if should_split or i == len(raw_segments) - 1:
            merged_text = " ".join([s.get("text", "").strip() for s in current_chunk if s.get("text", "").strip()])
            actual_end = seg_end
            actual_dur = round(actual_end - current_start, 2)
            
            scene_idx = len(scenes) + 1
            scene_entry = {
                "index": scene_idx,
                "image_filename": f"scene_{scene_idx:03d}.png",
                "start": round(current_start, 3),
                "end": round(actual_end, 3),
                "duration": actual_dur,
                "start_formatted": format_seconds_display(current_start),
                "end_formatted": format_seconds_display(actual_end),
                "text": merged_text or "[Scene Visual Dialogue]",
                "prompt": ""  # populated by prompt enhancer
            }
            scenes.append(scene_entry)
            
            # Reset for next chunk
            current_chunk = []
            if i + 1 < len(raw_segments):
                current_start = raw_segments[i + 1].get("start", actual_end)

    return scenes


def export_scenes_json(scenes: List[Dict[str, Any]], output_path: Path) -> Path:
    """Exports scenes to a clean JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scenes, f, indent=2, ensure_ascii=False)
    return output_path


def export_scenes_csv(scenes: List[Dict[str, Any]], output_path: Path) -> Path:
    """Exports scenes to a structured CSV spreadsheet."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "Scene #",
        "Image Filename",
        "Start Timestamp",
        "End Timestamp",
        "Duration (s)",
        "Spoken Transcript",
        "AI Image Prompt"
    ]
    
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(fieldnames)
        for s in scenes:
            writer.writerow([
                s.get("index"),
                s.get("image_filename"),
                s.get("start_formatted"),
                s.get("end_formatted"),
                s.get("duration"),
                s.get("text"),
                s.get("prompt")
            ])
    return output_path
