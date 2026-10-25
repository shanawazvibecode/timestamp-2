import subprocess
import json
import shutil
from pathlib import Path
from typing import Tuple, Optional


def find_ffmpeg_binaries() -> Tuple[str, str]:
    """Find system ffmpeg and ffprobe binaries."""
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    ffprobe_bin = shutil.which("ffprobe") or "ffprobe"
    return ffmpeg_bin, ffprobe_bin


def get_media_duration(file_path: Path) -> float:
    """
    Get media duration in seconds using ffprobe.
    Returns 0.0 if duration cannot be extracted.
    """
    _, ffprobe_bin = find_ffmpeg_binaries()
    cmd = [
        ffprobe_bin,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        str(file_path)
    ]
    
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
        duration_str = data.get("format", {}).get("duration")
        if duration_str:
            return float(duration_str)
    except Exception as e:
        print(f"[AudioExtractor] Warning: ffprobe duration check failed: {e}")
    
    return 0.0


def extract_audio_for_transcription(input_path: Path, output_wav_path: Path) -> Tuple[bool, str]:
    """
    Extracts audio from video/audio to a standard 16kHz mono 16-bit WAV file
    optimized for speech-to-text models like Whisper.
    """
    ffmpeg_bin, _ = find_ffmpeg_binaries()
    output_wav_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        ffmpeg_bin,
        "-y",               # overwrite output
        "-i", str(input_path),
        "-vn",              # disable video
        "-acodec", "pcm_s16le",
        "-ar", "16000",     # 16kHz sample rate
        "-ac", "1",         # mono channel
        str(output_wav_path)
    ]

    try:
        process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if process.returncode != 0:
            return False, f"FFmpeg failed with code {process.returncode}: {process.stderr}"
        return True, "Audio extracted successfully."
    except Exception as e:
        return False, f"FFmpeg execution error: {str(e)}"
