import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from pathlib import Path
from typing import List, Dict, Any


def seconds_to_frames(seconds: float, fps: int) -> int:
    """Convert seconds to exact frame count based on fps."""
    return int(round(seconds * fps))


def format_timecode(frames: int, fps: int) -> str:
    """Format frame number to standard timecode string HH:MM:SS:FF"""
    total_seconds = frames // fps
    f = frames % fps
    s = total_seconds % 60
    m = (total_seconds // 60) % 60
    h = total_seconds // 3600
    return f"{h:02d}:{m:02d}:{s:02d}:{f:02d}"


def generate_fcp7_xmeml(
    scenes: List[Dict[str, Any]],
    fps: int = 24,
    sequence_name: str = "SyncForge Timeline",
    width: int = 1920,
    height: int = 1080
) -> str:
    """
    Generate standard Final Cut Pro 7 XMEML version 4 XML format.
    Compatible with Adobe Premiere Pro, DaVinci Resolve, and Final Cut Pro.
    Places each scene as a visual clipitem on Video Track 1 referencing scene_XXX.png.
    """
    total_duration_sec = scenes[-1].get("end", 0.0) if scenes else 0.0
    total_frames = max(1, seconds_to_frames(total_duration_sec, fps))

    clipitems_xml = []
    
    current_track_frame = 0

    for idx, scene in enumerate(scenes, start=1):
        filename = scene.get("image_filename", f"scene_{idx:03d}.png")
        start_sec = scene.get("start", 0.0)
        end_sec = scene.get("end", start_sec + 5.0)
        
        # Exact timeline frames
        start_frame = seconds_to_frames(start_sec, fps)
        end_frame = seconds_to_frames(end_sec, fps)
        
        # Ensure continuity if minor gaps or rounding differences exist
        if start_frame < current_track_frame:
            start_frame = current_track_frame
        if end_frame <= start_frame:
            end_frame = start_frame + max(1, fps * 3) # at least 3 seconds
            
        duration_frames = end_frame - start_frame
        current_track_frame = end_frame

        spoken_text = escape(scene.get("text", "").replace("\n", " "))
        prompt = escape(scene.get("prompt", "").replace("\n", " "))
        safe_name = escape(filename)

        clip_item = f"""          <clipitem id="clipitem-{idx}">
            <name>{safe_name}</name>
            <duration>{duration_frames}</duration>
            <rate>
              <timebase>{fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <start>{start_frame}</start>
            <end>{end_frame}</end>
            <in>0</in>
            <out>{duration_frames}</out>
            <file id="file-{idx}">
              <name>{safe_name}</name>
              <pathurl>file://localhost/{safe_name}</pathurl>
              <rate>
                <timebase>{fps}</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <media>
                <video>
                  <samplecharacteristics>
                    <width>{width}</width>
                    <height>{height}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
            <labels>
              <label2>Cerulean</label2>
            </labels>
            <comments>
              <mastercomment1>Spoken: {spoken_text}</mastercomment1>
              <mastercomment2>Visual Prompt: {prompt}</mastercomment2>
            </comments>
          </clipitem>"""
        clipitems_xml.append(clip_item)

    tracks_content = "\n".join(clipitems_xml)

    xmeml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>{escape(sequence_name)}</name>
    <duration>{total_frames}</duration>
    <rate>
      <timebase>{fps}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate>
        <timebase>{fps}</timebase>
        <ntsc>FALSE</ntsc>
      </rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>{fps}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <width>{width}</width>
            <height>{height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>
        <track>
{tracks_content}
        </track>
      </video>
    </media>
  </sequence>
</xmeml>
"""
    return xmeml_content


def generate_ai_manifest_xml(scenes: List[Dict[str, Any]], fps: int = 24) -> str:
    """
    Generate a clean structured AI prompt manifest XML.
    """
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<syncforge_manifest version="1.0">',
        f'  <metadata fps="{fps}" total_scenes="{len(scenes)}" />',
        '  <scenes>'
    ]

    for s in scenes:
        idx = s.get("index", 1)
        filename = escape(s.get("image_filename", f"scene_{idx:03d}.png"))
        start = s.get("start", 0.0)
        end = s.get("end", 0.0)
        duration = s.get("duration", round(end - start, 2))
        start_tc = format_timecode(seconds_to_frames(start, fps), fps)
        end_tc = format_timecode(seconds_to_frames(end, fps), fps)
        text = escape(s.get("text", ""))
        prompt = escape(s.get("prompt", ""))

        xml_lines.append(f'    <scene id="{idx}">')
        xml_lines.append(f'      <filename>{filename}</filename>')
        xml_lines.append(f'      <start_seconds>{start:.3f}</start_seconds>')
        xml_lines.append(f'      <end_seconds>{end:.3f}</end_seconds>')
        xml_lines.append(f'      <duration_seconds>{duration:.3f}</duration_seconds>')
        xml_lines.append(f'      <timecode_in>{start_tc}</timecode_in>')
        xml_lines.append(f'      <timecode_out>{end_tc}</timecode_out>')
        xml_lines.append(f'      <spoken_transcript>{text}</spoken_transcript>')
        xml_lines.append(f'      <ai_image_prompt>{prompt}</ai_image_prompt>')
        xml_lines.append('    </scene>')

    xml_lines.append('  </scenes>')
    xml_lines.append('</syncforge_manifest>')
    return "\n".join(xml_lines)


def write_xml_files(scenes: List[Dict[str, Any]], output_dir: Path, fps: int = 24) -> Dict[str, Path]:
    """Write both FCP7 timeline XML and clean AI prompt XML."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timeline_path = output_dir / "timeline_premiere_davinci.xml"
    manifest_path = output_dir / "ai_prompt_manifest.xml"

    timeline_content = generate_fcp7_xmeml(scenes, fps=fps)
    timeline_path.write_text(timeline_content, encoding="utf-8")

    manifest_content = generate_ai_manifest_xml(scenes, fps=fps)
    manifest_path.write_text(manifest_content, encoding="utf-8")

    return {
        "timeline_xml": timeline_path,
        "manifest_xml": manifest_path
    }
