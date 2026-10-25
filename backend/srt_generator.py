import json
from typing import List, Dict, Any
from pathlib import Path


def format_timestamp_srt(seconds: float) -> str:
    """Format seconds into SRT timestamp format: HH:MM:SS,mmm"""
    if seconds < 0:
        seconds = 0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        millis = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def format_timestamp_display(seconds: float) -> str:
    """Format seconds into clean display format: HH:MM:SS.mmm"""
    if seconds < 0:
        seconds = 0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        millis = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"


def generate_srt_content(segments: List[Dict[str, Any]]) -> str:
    """
    Generate standard SRT formatted string from a list of segments.
    Each segment should contain 'start', 'end', and 'text'.
    """
    if not segments:
        return "1\n00:00:00,000 --> 00:00:05,000\n[Ambient / Instrumental Audio]\n\n"

    srt_lines = []
    counter = 1
    for seg in segments:
        start_str = format_timestamp_srt(seg.get("start", 0.0))
        end_str = format_timestamp_srt(seg.get("end", 0.0))
        text = seg.get("text", "").strip()
        if not text:
            continue
        
        srt_lines.append(f"{counter}")
        srt_lines.append(f"{start_str} --> {end_str}")
        srt_lines.append(text)
        srt_lines.append("")
        counter += 1

    if not srt_lines:
        return "1\n00:00:00,000 --> 00:00:05,000\n[Ambient / Instrumental Audio]\n\n"
        
    return "\n".join(srt_lines)


def generate_word_level_srt(segments: List[Dict[str, Any]]) -> str:
    """
    Generate an SRT file where every individual spoken word has its exact timestamp.
    """
    words_list = []
    for seg in segments:
        words = seg.get("words", [])
        if words:
            words_list.extend(words)
        else:
            # Fallback to segment text if words not extracted
            words_list.append({
                "word": seg.get("text", "").strip(),
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0)
            })

    if not words_list:
        return "1\n00:00:00,000 --> 00:00:01,000\n[Audio]\n\n"

    srt_lines = []
    counter = 1
    for item in words_list:
        word = item.get("word", "").strip()
        if not word:
            continue
        start_str = format_timestamp_srt(item.get("start", 0.0))
        end_str = format_timestamp_srt(item.get("end", 0.0))

        srt_lines.append(f"{counter}")
        srt_lines.append(f"{start_str} --> {end_str}")
        srt_lines.append(word)
        srt_lines.append("")
        counter += 1

    return "\n".join(srt_lines)


def generate_gemini_transcript(segments: List[Dict[str, Any]]) -> str:
    """
    Generates a beautifully structured transcript tailored for Gemini Storyboard Director.
    Includes exact start/end timestamps, line duration, and word timings.
    """
    if not segments:
        return "No spoken dialogue detected."

    lines = [
        "=== SCRIPT WITH EXACT TIMESTAMPS FOR GEMINI STORYBOARD DIRECTOR ===",
        "Instructions for Gemini: Use these exact timestamps to align visual hooks and still images.",
        "--------------------------------------------------------------------------------\n"
    ]

    for i, seg in enumerate(segments, 1):
        start = seg.get("start", 0.0)
        end = seg.get("end", 0.0)
        dur = round(end - start, 2)
        text = seg.get("text", "").strip()
        start_fmt = format_timestamp_display(start)
        end_fmt = format_timestamp_display(end)

        lines.append(f"[Line {i:03d} | {start_fmt} -> {end_fmt} | Duration: {dur}s]")
        lines.append(f'"{text}"')

        words = seg.get("words", [])
        if words:
            word_strs = [f"{w.get('word', '').strip()}({w.get('start', 0.0):.2f}-{w.get('end', 0.0):.2f}s)" for w in words if w.get('word', '').strip()]
            if word_strs:
                lines.append(f"Word Timings: {' '.join(word_strs)}")
        lines.append("")

    return "\n".join(lines)


def extract_all_words(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract flattened list of words with timing info."""
    all_words = []
    idx = 1
    for seg in segments:
        words = seg.get("words", [])
        for w in words:
            word_str = w.get("word", "").strip()
            if not word_str:
                continue
            start = round(w.get("start", 0.0), 3)
            end = round(w.get("end", 0.0), 3)
            dur = round(end - start, 3)
            all_words.append({
                "index": idx,
                "word": word_str,
                "start": start,
                "end": end,
                "duration": dur,
                "start_formatted": format_timestamp_display(start),
                "end_formatted": format_timestamp_display(end),
                "probability": round(w.get("probability", 1.0), 2)
            })
            idx += 1
    return all_words


def write_srt_file(segments: List[Dict[str, Any]], output_path: Path) -> Path:
    """Write standard SRT file to destination path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    content = generate_srt_content(segments)
    output_path.write_text(content, encoding="utf-8")
    return output_path


def write_word_level_srt_file(segments: List[Dict[str, Any]], output_path: Path) -> Path:
    """Write word-level SRT file to destination path."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    content = generate_word_level_srt(segments)
    output_path.write_text(content, encoding="utf-8")
    return output_path


def write_gemini_transcript_file(segments: List[Dict[str, Any]], output_path: Path) -> Path:
    """Write prompt-ready Gemini transcript text file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    content = generate_gemini_transcript(segments)
    output_path.write_text(content, encoding="utf-8")
    return output_path


def write_words_json_file(segments: List[Dict[str, Any]], output_path: Path) -> Path:
    """Write flattened word timestamps JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    words = extract_all_words(segments)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(words, f, indent=2, ensure_ascii=False)
    return output_path
