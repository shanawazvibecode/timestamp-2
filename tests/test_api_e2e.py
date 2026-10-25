import time
import json
import urllib.request
import mimetypes
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
sample_wav = Path(__file__).resolve().parent.parent / "backend" / "temp" / "sample_test.wav"

if not sample_wav.exists():
    print(f"Sample WAV not found at {sample_wav}")
    exit(1)

print(f"Uploading {sample_wav} to {BASE_URL}/api/process...")

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = []
body.append(f'--{boundary}'.encode())
body.append(f'Content-Disposition: form-data; name="file"; filename="{sample_wav.name}"'.encode())
body.append(b'Content-Type: audio/wav')
body.append(b'')
body.append(sample_wav.read_bytes())
body.append(f'--{boundary}'.encode())
body.append(b'Content-Disposition: form-data; name="pacing"')
body.append(b'')
body.append(b'balanced')
body.append(f'--{boundary}--'.encode())
body.append(b'')

payload = b'\r\n'.join(body)

req = urllib.request.Request(
    f"{BASE_URL}/api/process",
    data=payload,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(payload))
    },
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())

print("Status response:", data)
job_id = data["job_id"]

# Poll job status
status = None
job_info = None
for i in range(30):
    time.sleep(1)
    status_req = urllib.request.Request(f"{BASE_URL}/api/jobs/{job_id}")
    with urllib.request.urlopen(status_req) as s_resp:
        job_info = json.loads(s_resp.read().decode())
    status = job_info.get("status")
    progress = job_info.get("progress")
    print(f"Polling [{i+1}/30] Status: {status}, Progress: {progress}%")
    if status in ("completed", "failed"):
        break

assert status == "completed", f"Job failed: {job_info.get('error')}"
output_files = job_info.get("output_files", {})
print("\nOutput files generated:", output_files)

assert "srt" in output_files and Path(output_files["srt"]).exists(), "SRT missing"
assert "words_srt" in output_files and Path(output_files["words_srt"]).exists(), "Words SRT missing"
assert "gemini_txt" in output_files and Path(output_files["gemini_txt"]).exists(), "Gemini TXT missing"
assert "words_json" in output_files and Path(output_files["words_json"]).exists(), "Words JSON missing"

print("\n--- SAMPLE GEMINI TRANSCRIPT PREVIEW ---")
gemini_txt_content = Path(output_files["gemini_txt"]).read_text(encoding="utf-8")
print(gemini_txt_content[:350])

print("\n--- SAMPLE WORD-LEVEL SRT PREVIEW ---")
words_srt_content = Path(output_files["words_srt"]).read_text(encoding="utf-8")
print(words_srt_content[:200])

print("\n[ALL E2E API CHECKS PASSED SUCCESSFULLY!]")
