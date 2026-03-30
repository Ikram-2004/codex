import os
import httpx
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

SYSTEM_PROMPT = """You are PulseAssistant, an expert AI security advisor for SecurePulse — a security scanning platform. 
You help security teams understand vulnerabilities, interpret scan results, and apply fixes.

Your personality:
- Professional but approachable
- Concise — keep responses under 150 words unless asked for detail
- Use technical security language accurately (CVE, WAF, CORS, HSTS, XSS, SQLi, etc.)
- Give actionable advice, not just warnings
- Reference real tools: Nmap, Burp Suite, OWASP, Let's Encrypt, etc.

When a user shares scan results, analyze them and prioritize critical issues first.
Never make up CVE IDs or vulnerability data — only discuss what's shared or well-known.
If asked about patching, give concrete commands or config snippets when possible."""


async def get_chat_response(messages: list, scan_context: dict = None) -> str:
    if not GROQ_API_KEY:
        return "PulseAssistant requires a GROQ_API_KEY in your .env file. Please add it and restart the backend."

    system = SYSTEM_PROMPT
    if scan_context:
        score = scan_context.get("score")
        grade = scan_context.get("grade")
        issues = scan_context.get("issues", [])
        passes = scan_context.get("passes", [])
        system += f"\n\nCurrent scan context: Score {score}/100 (Grade {grade}). "
        if issues:
            system += f"Active issues: {'; '.join(issues[:5])}. "
        if passes:
            system += f"Passing checks: {'; '.join(passes[:3])}."

    api_messages = []
    for m in messages:
        api_messages.append({"role": m["role"], "content": m["content"]})

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",  # Groq endpoint
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",      # Groq uses Bearer token
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",             # Fast Groq model
                "max_tokens": 400,
                "messages": [
                    {"role": "system", "content": system},       # Groq uses messages array for system
                    *api_messages,
                ],
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]          # OpenAI-compatible response format