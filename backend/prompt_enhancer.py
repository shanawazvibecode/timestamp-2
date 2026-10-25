import json
import re
import httpx
from typing import List, Dict, Any, Optional

DEFAULT_MASTER_STYLE = (
    "Cinematic photorealistic 8k, hyper-detailed, dramatic film lighting, "
    "shot on ARRI Alexa 35mm lens, depth of field, atmospheric, editorial quality"
)

def build_fallback_prompt(spoken_text: str, master_style: Optional[str] = None) -> str:
    """
    Intelligently generates a high-quality visual prompt template from spoken text.
    Removes common filler words, emphasizes key visual subjects, and blends with master style.
    """
    style = (master_style or "").strip() or DEFAULT_MASTER_STYLE
    clean_text = re.sub(r'[\r\n\t]+', ' ', spoken_text).strip()
    
    # Remove speech fillers
    clean_text = re.sub(r'\b(um|uh|like|you know|so yeah|basically|actually)\b', '', clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    
    if not clean_text:
        clean_text = "Atmospheric visual scene representing the dialogue narrative"
        
    # Create vivid framing based on the spoken line
    return f"{style} -- visual representation of: {clean_text}"


async def enhance_prompts_with_gemini(
    scenes: List[Dict[str, Any]],
    gemini_api_key: str,
    master_style: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Uses Google Gemini API to craft scene-by-scene AI image prompts based on
    the spoken transcript and master style direction.
    """
    if not gemini_api_key or not gemini_api_key.strip():
        # Fallback to local prompt builder
        for s in scenes:
            s["prompt"] = build_fallback_prompt(s.get("text", ""), master_style)
        return scenes

    style = (master_style or "").strip() or DEFAULT_MASTER_STYLE
    
    # Process in batches of 20 to avoid token limits
    batch_size = 20
    for i in range(0, len(scenes), batch_size):
        batch = scenes[i:i + batch_size]
        
        prompt_input = []
        for s in batch:
            prompt_input.append({
                "id": s.get("index"),
                "spoken_text": s.get("text", "")
            })
            
        system_instruction = (
            "You are a professional Hollywood cinematography & AI art director. "
            "For each spoken text segment in the video, create a single, highly vivid, descriptive "
            "visual scene image prompt suitable for Midjourney v6 / Flux / Stable Diffusion. "
            f"Adhere strictly to this overarching visual style: '{style}'. "
            "Do not include text overlays, subtitles, or speech bubbles in the images. "
            "Focus on composition, lighting, camera angle, subject, environment, and mood. "
            "Return ONLY a valid JSON array of objects with keys 'id' (integer) and 'prompt' (string)."
        )

        user_content = f"Here are the scenes to generate image prompts for:\n{json.dumps(prompt_input, indent=2)}"
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key.strip()}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\n{user_content}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "responseMimeType": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidate = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(candidate)
                    
                    # Map generated prompts back to scenes
                    prompt_map = {item["id"]: item["prompt"] for item in parsed if "id" in item and "prompt" in item}
                    for s in batch:
                        s["prompt"] = prompt_map.get(s.get("index"), build_fallback_prompt(s.get("text", ""), master_style))
                else:
                    print(f"[GeminiEnhancer] HTTP {resp.status_code}: {resp.text}")
                    for s in batch:
                        s["prompt"] = build_fallback_prompt(s.get("text", ""), master_style)
        except Exception as e:
            print(f"[GeminiEnhancer] Fallback due to error: {e}")
            for s in batch:
                s["prompt"] = build_fallback_prompt(s.get("text", ""), master_style)
                
    return scenes
