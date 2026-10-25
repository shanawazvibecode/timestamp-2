import os
import time
from pathlib import Path
from typing import List, Dict, Any, Callable, Optional


class TranscriptionEngine:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def _get_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel

            # Determine best device and compute type
            device = "cpu"
            compute_type = "int8"
            
            try:
                import torch
                # Check for CUDA if available
                if torch.cuda.is_available():
                    device = "cuda"
                    compute_type = "float16"
            except (ImportError, Exception):
                pass

            print(f"[Transcriber] Initializing faster-whisper model '{self.model_size}' on {device} ({compute_type})...")
            self._model = WhisperModel(self.model_size, device=device, compute_type=compute_type)
        return self._model

    def transcribe(
        self,
        audio_path: Path,
        total_duration: float,
        progress_callback: Optional[Callable[[float, str, float, float], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Transcribes the audio file using faster-whisper with word-level timestamps.
        Updates progress from 15% to 80% dynamically.
        """
        try:
            model = self._get_model()
            
            if progress_callback:
                progress_callback(16.0, "Transcribing speech into timestamped text...", 0.0, total_duration)

            segments_generator, info = model.transcribe(
                str(audio_path),
                beam_size=5,
                word_timestamps=True,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            actual_duration = total_duration if total_duration > 0 else (info.duration if info.duration else 1.0)
            
            raw_segments = []
            
            for seg in segments_generator:
                seg_dict = {
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": seg.text.strip(),
                    "words": [
                        {"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3), "probability": w.probability}
                        for w in (seg.words or [])
                    ]
                }
                raw_segments.append(seg_dict)

                # Calculate progress between 15% and 80%
                current_time = seg.end
                ratio = min(1.0, current_time / actual_duration) if actual_duration > 0 else 0.5
                progress_pct = round(15.0 + (ratio * 65.0), 1)

                if progress_callback:
                    msg = f"Transcribed up to {format_time(current_time)} of {format_time(actual_duration)}"
                    progress_callback(progress_pct, msg, current_time, actual_duration)

            if progress_callback:
                progress_callback(80.0, "Transcription complete. Grouping scenes...", actual_duration, actual_duration)

            return raw_segments

        except Exception as e:
            print(f"[Transcriber] faster-whisper error: {e}")
            raise e


def format_time(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


# Singleton engine instance
default_engine = TranscriptionEngine()
