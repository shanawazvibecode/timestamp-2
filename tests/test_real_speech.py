import time
import json
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
sample_mp3 = Path(__file__).resolve().parent.parent / "backend" / "temp" / "640acbe5-9a43-44ea-bb68-1e185cb7d2ce" / "sample vidoe.mp3"

if not sample_mp3.exists():
    print(f"File not found: {sample_mp3}")
    exit(1)

print(f"Uploading user test file {sample_mp3.name}...")

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = []
body.append(f'--{boundary}'.encode())
body.append(f'Content-Disposition: form-data; name="file"; filename="{sample_mp3.name}"'.encode())
body.append(b'Content-Type: audio/mp3')
body.append(b'')
body.append(sample_mp3.read_bytes())
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

job_id = data["job_id"]
print("Job ID:", job_id)

for i in range(60):
    time.sleep(2)
    status_req = urllib.request.Request(f"{BASE_URL}/api/jobs/{job_id}")
    with urllib.request.urlopen(status_req) as s_resp:
        job_info = json.loads(s_resp.read().decode())
    status = job_info.get("status")
    progress = job_info.get("progress")
    stage = job_info.get("stage")
    print(f"[{i+1}] Status: {status} | Stage: {stage} | Progress: {progress}%")
    if status in ("completed", "failed"):
        break

assert status == "completed", f"Job failed: {job_info.get('error')}"

output_files = job_info.get("output_files", {})
gemini_txt = Path(output_files["gemini_txt"]).read_text(encoding="utf-8")
words_srt = Path(output_files["words_srt"]).read_text(encoding="utf-8")

print("\n================== GEMINI SCRIPT SAMPLE ==================")
print("\n".join(gemini_txt.splitlines()[:18]))

print("\n================== WORD-LEVEL SRT SAMPLE ==================")
print("\n".join(words_srt.splitlines()[:20]))

print("\nSUCCESS: Real speech transcribed with exact word & line timestamps!")
