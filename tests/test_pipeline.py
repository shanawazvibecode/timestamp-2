import sys
import unittest
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.scene_grouper import group_segments_into_scenes, export_scenes_json, export_scenes_csv
from backend.srt_generator import (
    generate_srt_content,
    write_srt_file,
    generate_word_level_srt,
    generate_gemini_transcript,
    extract_all_words,
    write_word_level_srt_file,
    write_gemini_transcript_file,
    write_words_json_file
)
from backend.xml_generator import generate_fcp7_xmeml, generate_ai_manifest_xml, write_xml_files
from backend.prompt_enhancer import build_fallback_prompt


class TestSyncForgePipeline(unittest.TestCase):
    def setUp(self):
        # Sample transcript segments resembling a long-form video interview/podcast with word-level info
        self.sample_segments = [
            {
                "start": 0.0,
                "end": 2.5,
                "text": "Welcome to our deep dive documentary.",
                "words": [
                    {"word": "Welcome", "start": 0.0, "end": 0.5, "probability": 0.98},
                    {"word": "to", "start": 0.5, "end": 0.7, "probability": 0.99},
                    {"word": "our", "start": 0.7, "end": 0.9, "probability": 0.99},
                    {"word": "deep", "start": 0.9, "end": 1.3, "probability": 0.97},
                    {"word": "dive", "start": 1.3, "end": 1.7, "probability": 0.96},
                    {"word": "documentary.", "start": 1.7, "end": 2.5, "probability": 0.99}
                ]
            },
            {"start": 2.8, "end": 5.2, "text": "Today we explore the mysterious origins of deep space."},
            {"start": 5.5, "end": 8.1, "text": "Over ten billion years ago, cosmic dust began coalescing."},
            {"start": 8.3, "end": 12.0, "text": "Giant nebulae ignited across the silent universe."},
            {"start": 12.5, "end": 16.4, "text": "And in that silent expanse, stars formed for the first time."},
            {"start": 17.0, "end": 21.0, "text": "Astronomers today use advanced observatories to observe these remnants."},
        ]

    def test_srt_generation(self):
        srt_text = generate_srt_content(self.sample_segments)
        self.assertIn("1\n00:00:00,000 --> 00:00:02,500\nWelcome to our deep dive documentary.", srt_text)
        self.assertIn("--> 00:00:21,000", srt_text)
        print("[PASS] SRT generation verified.")

    def test_word_level_srt_and_gemini_transcript(self):
        word_srt = generate_word_level_srt(self.sample_segments)
        self.assertIn("Welcome", word_srt)
        self.assertIn("00:00:00,000 --> 00:00:00,500", word_srt)

        gemini_txt = generate_gemini_transcript(self.sample_segments)
        self.assertIn("=== SCRIPT WITH EXACT TIMESTAMPS FOR GEMINI STORYBOARD DIRECTOR ===", gemini_txt)
        self.assertIn("Line 001", gemini_txt)
        self.assertIn("Welcome(0.00-0.50s)", gemini_txt)

        words = extract_all_words(self.sample_segments)
        self.assertTrue(len(words) >= 6)
        self.assertEqual(words[0]["word"], "Welcome")
        print(f"[PASS] Word-level SRT and Gemini transcript verified ({len(words)} words extracted).")

    def test_scene_grouping_balanced(self):
        scenes = group_segments_into_scenes(self.sample_segments, pacing="balanced")
        self.assertTrue(len(scenes) >= 2)
        for s in scenes:
            self.assertTrue(s["duration"] > 0)
            self.assertTrue(s["image_filename"].startswith("scene_"))
            self.assertTrue(len(s["text"]) > 0)
        print(f"[PASS] Scene grouping verified: {len(scenes)} scenes generated from {len(self.sample_segments)} segments.")

    def test_scene_grouping_fast(self):
        scenes_fast = group_segments_into_scenes(self.sample_segments, pacing="fast")
        scenes_relaxed = group_segments_into_scenes(self.sample_segments, pacing="relaxed")
        self.assertTrue(len(scenes_fast) >= len(scenes_relaxed))
        print(f"[PASS] Pacing sensitivity verified: Fast={len(scenes_fast)} scenes, Relaxed={len(scenes_relaxed)} scenes.")

    def test_xml_generation(self):
        scenes = group_segments_into_scenes(self.sample_segments, pacing="balanced")
        for s in scenes:
            s["prompt"] = build_fallback_prompt(s["text"], "Cinematic 8k, space documentary")

        # FCP7 XMEML
        xmeml = generate_fcp7_xmeml(scenes, fps=24, sequence_name="Test Timeline")
        self.assertIn('<xmeml version="4">', xmeml)
        self.assertIn('<sequence id="sequence-1">', xmeml)
        self.assertIn('<name>Test Timeline</name>', xmeml)
        self.assertIn('<timebase>24</timebase>', xmeml)
        self.assertIn('<clipitem id="clipitem-1">', xmeml)
        self.assertIn('<name>scene_001.png</name>', xmeml)
        self.assertIn('</xmeml>', xmeml)

        # AI Manifest XML
        ai_manifest = generate_ai_manifest_xml(scenes, fps=24)
        self.assertIn('<syncforge_manifest version="1.0">', ai_manifest)
        self.assertIn('<ai_image_prompt>', ai_manifest)
        print("[PASS] FCP7 XMEML v4 and AI Manifest XML generation verified.")

    def test_file_writing(self):
        test_out = ROOT_DIR / "backend" / "temp" / "test_output"
        scenes = group_segments_into_scenes(self.sample_segments, pacing="balanced")
        for s in scenes:
            s["prompt"] = build_fallback_prompt(s["text"])

        srt_file = write_srt_file(self.sample_segments, test_out / "test.srt")
        xml_files = write_xml_files(scenes, test_out, fps=30)
        json_file = export_scenes_json(scenes, test_out / "test.json")
        csv_file = export_scenes_csv(scenes, test_out / "test.csv")

        self.assertTrue(srt_file.exists())
        self.assertTrue(xml_files["timeline_xml"].exists())
        self.assertTrue(xml_files["manifest_xml"].exists())
        self.assertTrue(json_file.exists())
        self.assertTrue(csv_file.exists())
        print("[PASS] All export files successfully written and validated on disk.")


if __name__ == '__main__':
    unittest.main()
