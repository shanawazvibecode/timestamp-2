import asyncio
import os
import shutil
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from backend.config import UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR, DEFAULT_FPS, DEFAULT_PACING
from backend.audio_extractor import get_media_duration, extract_audio_for_transcription
from backend.transcriber import default_engine
from backend.scene_grouper import group_segments_into_scenes, export_scenes_json, export_scenes_csv
from backend.srt_generator import (
    write_srt_file,
    write_word_level_srt_file,
    write_gemini_transcript_file,
    write_words_json_file,
    extract_all_words,
    generate_gemini_transcript,
)
from backend.xml_generator import write_xml_files
from backend.prompt_enhancer import enhance_prompts_with_gemini

app = FastAPI(title="SyncForge Studio API", version="1.0.0")

# Enable CORS for desktop and browser clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job state store
jobs: Dict[str, Dict[str, Any]] = {}
job_event_queues: Dict[str, list[asyncio.Queue]] = {}


def log_job_message(job_id: str, message: str, stage: str, progress: float):
    if job_id not in jobs:
        return
    job = jobs[job_id]
    job["stage"] = stage
    job["progress"] = progress
    job["last_message"] = message
    timestamp = time.strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    job["logs"].append(log_entry)
    
    # Notify all active SSE subscribers for this job
    if job_id in job_event_queues:
        for q in job_event_queues[job_id]:
            try:
                q.put_nowait({
                    "stage": stage,
                    "progress": progress,
                    "message": message,
                    "logs": job["logs"][-12:], # send recent logs
                    "status": job["status"],
                    "total_scenes": len(job.get("scenes", []))
                })
            except Exception:
                pass


async def run_pipeline_task(
    job_id: str,
    input_file_path: Path,
    original_filename: str,
    pacing: str,
    fps: int,
    gemini_api_key: Optional[str],
    master_style: Optional[str]
):
    try:
        job = jobs[job_id]
        job["status"] = "processing"

        # -------------------------------------------------------------
        # STAGE 1: Uploading & Audio Extraction (0% - 15%)
        # -------------------------------------------------------------
        log_job_message(job_id, f"Initializing analysis for '{original_filename}'...", "Stage 1: Extracting Audio", 3.0)
        await asyncio.sleep(0.3)
        
        # Check media duration
        duration = get_media_duration(input_file_path)
        job["duration"] = duration
        duration_msg = f"Detected duration: {duration:.1f} seconds" if duration > 0 else "Analyzing media stream..."
        log_job_message(job_id, duration_msg, "Stage 1: Extracting Audio", 7.0)

        # Extract normalized mono 16kHz WAV
        extracted_wav_path = TEMP_DIR / f"{job_id}_extracted.wav"
        success, msg = extract_audio_for_transcription(input_file_path, extracted_wav_path)
        if not success:
            raise RuntimeError(f"Audio extraction failed: {msg}")

        log_job_message(job_id, "Audio extraction complete. Preparing Whisper model...", "Stage 1: Extracting Audio", 15.0)
        await asyncio.sleep(0.2)

        # -------------------------------------------------------------
        # STAGE 2: Transcribing Audio with Timestamps (15% - 80%)
        # -------------------------------------------------------------
        log_job_message(job_id, "Transcribing speech and word-level timestamps...", "Stage 2: Transcribing Audio", 18.0)

        def on_transcribe_progress(pct: float, message: str, cur_t: float, tot_t: float):
            log_job_message(job_id, message, "Stage 2: Transcribing Audio", pct)

        # Execute transcription in thread pool so async event loop isn't blocked
        raw_segments = await asyncio.to_thread(
            default_engine.transcribe,
            extracted_wav_path,
            duration,
            on_transcribe_progress
        )

        log_job_message(job_id, f"Transcription complete: found {len(raw_segments)} dialogue segments.", "Stage 2: Transcribing Audio", 80.0)
        await asyncio.sleep(0.2)

        # -------------------------------------------------------------
        # STAGE 3: Grouping Visual Scenes & Generating Exports (80% - 100%)
        # -------------------------------------------------------------
        log_job_message(job_id, f"Grouping into scenes using {pacing.capitalize()} pacing...", "Stage 3: Generating Files", 83.0)
        
        scenes = group_segments_into_scenes(raw_segments, pacing=pacing)
        log_job_message(job_id, f"Created {len(scenes)} visual scene slots.", "Stage 3: Generating Files", 87.0)

        # AI prompt enrichment (Gemini if key provided, else intelligent local prompt engine)
        log_job_message(job_id, "Enriching scene visual prompts...", "Stage 3: Generating Files", 90.0)
        scenes = await enhance_prompts_with_gemini(scenes, gemini_api_key or "", master_style)
        job["scenes"] = scenes

        # Write output files
        job_output_dir = OUTPUT_DIR / job_id
        job_output_dir.mkdir(parents=True, exist_ok=True)

        # 1. Standard Subtitles (.srt)
        srt_path = job_output_dir / "subtitles.srt"
        write_srt_file(raw_segments, srt_path)

        # 2. Word-Level Subtitles (.srt)
        words_srt_path = job_output_dir / "subtitles_words.srt"
        write_word_level_srt_file(raw_segments, words_srt_path)

        # 3. Gemini Prompt-Ready Transcript (.txt)
        gemini_txt_path = job_output_dir / "gemini_storyboard_transcript.txt"
        gemini_transcript_str = generate_gemini_transcript(raw_segments)
        gemini_txt_path.write_text(gemini_transcript_str, encoding="utf-8")

        # 4. Flattened Word Timestamps (.json)
        words_json_path = job_output_dir / "word_timestamps.json"
        all_words = extract_all_words(raw_segments)
        write_words_json_file(raw_segments, words_json_path)

        # 5. Final Cut Pro 7 XML timeline & AI prompt manifest
        xml_results = write_xml_files(scenes, job_output_dir, fps=fps)

        # 6. Scene Prompts JSON & CSV
        json_path = job_output_dir / "scenes.json"
        export_scenes_json(scenes, json_path)

        csv_path = job_output_dir / "scenes.csv"
        export_scenes_csv(scenes, csv_path)

        job["output_files"] = {
            "srt": str(srt_path),
            "words_srt": str(words_srt_path),
            "gemini_txt": str(gemini_txt_path),
            "words_json": str(words_json_path),
            "timeline_xml": str(xml_results["timeline_xml"]),
            "manifest_xml": str(xml_results["manifest_xml"]),
            "json": str(json_path),
            "csv": str(csv_path)
        }
        job["segments"] = raw_segments
        job["words"] = all_words
        job["gemini_transcript"] = gemini_transcript_str

        # Cleanup temporary audio
        if extracted_wav_path.exists():
            try:
                extracted_wav_path.unlink()
            except Exception:
                pass

        job["status"] = "completed"
        log_job_message(job_id, "Processing complete! All exports generated successfully.", "Complete", 100.0)

    except Exception as e:
        print(f"[SyncForge API] Error processing job {job_id}: {e}")
        job["status"] = "failed"
        job["error"] = str(e)
        log_job_message(job_id, f"Error: {str(e)}", "Failed", 100.0)


@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "SyncForge Studio Backend",
        "version": "1.0.0"
    }


@app.post("/api/process")
async def start_process(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pacing: str = Form("balanced"),
    fps: int = Form(24),
    gemini_api_key: Optional[str] = Form(None),
    master_style: Optional[str] = Form(None)
):
    job_id = str(uuid.uuid4())
    job_temp_dir = TEMP_DIR / job_id
    job_temp_dir.mkdir(parents=True, exist_ok=True)
    
    input_file_path = job_temp_dir / file.filename
    with open(input_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "file_size": input_file_path.stat().st_size,
        "pacing": pacing,
        "fps": fps,
        "status": "queued",
        "progress": 0.0,
        "stage": "Initializing",
        "last_message": "File received. Queueing job...",
        "logs": [],
        "scenes": [],
        "output_files": {},
        "error": None
    }

    background_tasks.add_task(
        run_pipeline_task,
        job_id,
        input_file_path,
        file.filename,
        pacing,
        fps,
        gemini_api_key,
        master_style
    )

    return {"job_id": job_id, "status": "queued"}


@app.get("/api/progress/{job_id}")
async def sse_progress(job_id: str):
    """
    Server-Sent Events (SSE) endpoint for real-time progress streaming.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    queue: asyncio.Queue = asyncio.Queue()
    if job_id not in job_event_queues:
        job_event_queues[job_id] = []
    job_event_queues[job_id].append(queue)

    async def event_generator():
        try:
            # Emit initial state immediately
            job = jobs[job_id]
            import json
            initial_data = json.dumps({
                "stage": job["stage"],
                "progress": job["progress"],
                "message": job["last_message"],
                "logs": job["logs"][-12:],
                "status": job["status"],
                "total_scenes": len(job.get("scenes", []))
            })
            yield f"data: {initial_data}\n\n"

            while True:
                # Wait for next event with a timeout for heartbeat
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(data)}\n\n"
                    if data.get("status") in ("completed", "failed"):
                        break
                except asyncio.TimeoutError:
                    # Send heartbeat keep-alive
                    yield ": heartbeat\n\n"
        finally:
            if job_id in job_event_queues and queue in job_event_queues[job_id]:
                job_event_queues[job_id].remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.get("/api/download/{job_id}/{file_type}")
def download_file(job_id: str, file_type: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job is not completed yet")

    output_files = job.get("output_files", {})
    file_path_str = output_files.get(file_type)

    if not file_path_str or not Path(file_path_str).exists():
        raise HTTPException(status_code=404, detail=f"File {file_type} not found")

    file_path = Path(file_path_str)
    stem = Path(job.get("filename", "syncforge")).stem

    export_names = {
        "srt": f"{stem}_subtitles.srt",
        "words_srt": f"{stem}_words_subtitles.srt",
        "gemini_txt": f"{stem}_gemini_transcript.txt",
        "words_json": f"{stem}_word_timestamps.json",
        "timeline_xml": f"{stem}_timeline_fcp7.xml",
        "manifest_xml": f"{stem}_ai_prompts.xml",
        "json": f"{stem}_scenes.json",
        "csv": f"{stem}_scenes.csv"
    }

    download_name = export_names.get(file_type, file_path.name)

    return FileResponse(
        path=str(file_path),
        filename=download_name,
        media_type="application/octet-stream"
    )
