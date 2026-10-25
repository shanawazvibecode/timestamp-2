import time
import httpx
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
TEST_AUDIO = Path(__file__).resolve().parent.parent / "backend" / "temp" / "sample_test.wav"


def test_end_to_end():
    print(f"[E2E] Testing API at {BASE_URL}...")
    
    # 1. Healthcheck
    resp = httpx.get(f"{BASE_URL}/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print("[E2E] [OK] Backend health verified.")

    # 2. Upload and start processing
    assert TEST_AUDIO.exists(), f"Test file {TEST_AUDIO} not found"
    
    with open(TEST_AUDIO, "rb") as f:
        files = {"file": ("sample_test.wav", f, "audio/wav")}
        data = {
            "pacing": "balanced",
            "fps": "24",
            "master_style": "Cinematic 8k film still, atmospheric lighting"
        }
        upload_resp = httpx.post(f"{BASE_URL}/api/process", files=files, data=data)
        
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    job_id = upload_resp.json().get("job_id")
    print(f"[E2E] [OK] Job queued with ID: {job_id}")

    # 3. Poll job status until complete (timeout 45s)
    max_wait = 45
    start_time = time.time()
    completed = False
    job_data = {}

    while time.time() - start_time < max_wait:
        status_resp = httpx.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert status_resp.status_code == 200
        job_data = status_resp.json()
        status = job_data.get("status")
        progress = job_data.get("progress", 0)
        stage = job_data.get("stage", "")

        print(f"[E2E] Progress: {progress}% | Stage: {stage} | Status: {status}")

        if status == "completed":
            completed = True
            break
        elif status == "failed":
            raise RuntimeError(f"Job failed: {job_data.get('error')}")

        time.sleep(1.5)

    assert completed, f"Job did not complete within {max_wait}s"
    print("[E2E] [OK] Processing reached 100% completed!")

    # 4. Verify all file downloads including word-level and Gemini formats
    file_types = [
        "srt",
        "words_srt",
        "gemini_txt",
        "words_json",
        "timeline_xml",
        "manifest_xml",
        "json",
        "csv"
    ]
    for file_type in file_types:
        dl_resp = httpx.get(f"{BASE_URL}/api/download/{job_id}/{file_type}")
        assert dl_resp.status_code == 200, f"Failed to download {file_type}: {dl_resp.status_code}"
        assert len(dl_resp.content) > 0, f"Downloaded {file_type} is empty"
        print(f"[E2E] [OK] Verified {file_type} download: {len(dl_resp.content)} bytes.")

    print("\n[E2E] ALL END-TO-END VERIFICATIONS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_end_to_end()
