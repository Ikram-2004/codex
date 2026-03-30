import os
import httpx
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── Knowledge Domains ──────────────────────────────────────────

KNOWLEDGE_DOMAINS = [
    {
        "id": "account-security",
        "icon": "🛡️",
        "color": "#e84393",
        "title": "Account Security",
        "desc": "Master multi-factor authentication, biometric locks, and session management protocols.",
        "articles": [
            {
                "title": "Resetting administrative credentials",
                "content": """## Resetting Administrative Credentials

### Step 1: Access the Admin Panel
Navigate to your SecurePulse dashboard and click on **Settings → Account Security**.

### Step 2: Initiate a Credential Reset
- Click **Reset Password** under the Security section
- You will receive a reset link to your registered email within 2 minutes
- The link expires in 15 minutes for security reasons

### Step 3: Set a Strong Password
Your new password must:
- Be at least 12 characters long
- Contain uppercase and lowercase letters
- Include at least one number and special character
- Not match any of your last 5 passwords

### Step 4: Re-authenticate Active Sessions
After reset, all active sessions will be invalidated. You'll need to log in again on all devices.

### Emergency Access
If you've lost access to your email, contact our security team at security@securepulse.io with your account verification code found in your original welcome email.

> **Security Tip**: Enable hardware security keys (FIDO2/WebAuthn) after resetting to prevent future lockouts."""
            },
            {
                "title": "Configuring hardware security keys",
                "content": """## Configuring Hardware Security Keys

Hardware security keys (FIDO2/WebAuthn) provide the strongest form of two-factor authentication available.

### Supported Devices
- **YubiKey** (5 Series recommended)
- **Google Titan Security Key**
- **SoloKeys**
- Any FIDO2-compliant device

### Setup Instructions

#### 1. Navigate to Security Settings
Go to **Settings → Account Security → Two-Factor Authentication → Add Hardware Key**

#### 2. Register Your Key
```
1. Insert your hardware key into a USB port
2. Click "Register New Key"
3. Touch the key's button when prompted
4. Name your key (e.g., "YubiKey Primary")
5. Save changes
```

#### 3. Test Your Key
Always verify the key works before relying on it:
- Log out and log back in
- When prompted for 2FA, insert your key and touch it

### Backup Keys
**Critical**: Register at least 2 hardware keys. Store the backup in a physically secure location. If you lose your only key without a backup, account recovery requires identity verification (48-72 hours).

### Browser Compatibility
- Chrome 67+, Firefox 60+, Safari 14+, Edge 79+
- Must use HTTPS (enforced on all SecurePulse pages)"""
            }
        ]
    },
    {
        "id": "scan-config",
        "icon": "⊙",
        "color": "#6c5ce7",
        "title": "Scan Configuration",
        "desc": "Fine-tune your perimeter scan frequency and threat detection depth.",
        "articles": [
            {
                "title": "Setting up automated scans",
                "content": """## Setting Up Automated Scans

Automated scans run on a schedule and alert you to new vulnerabilities as they emerge.

### Schedule Options
| Frequency | Use Case |
|-----------|----------|
| Continuous | Production APIs handling sensitive data |
| Daily | Public-facing websites |
| Weekly | Internal tools and staging environments |
| Monthly | Low-risk static sites |

### Configuring a Scheduled Scan

1. Go to **Scans → Scheduled Scans → New Schedule**
2. Enter your target URLs (website, app, GitHub repo)
3. Choose frequency and notification preferences
4. Enable **Delta Alerts** to only notify on new findings

### Notification Channels
- Email alerts (configurable per severity level)
- Slack/Teams webhooks
- PagerDuty integration for CRITICAL findings
- Custom webhook endpoints

### Scan Depth Settings
```
SURFACE:  Basic headers, SSL, exposed files (fastest)
STANDARD: + Admin panels, API key detection (recommended)  
DEEP:     + Subdomain enum, dependency audit (slowest)
```

> **Tip**: Use STANDARD for daily scans and DEEP for weekly scans to balance performance and coverage."""
            },
            {
                "title": "Understanding scan results",
                "content": """## Understanding Scan Results

### Severity Levels Explained

**CRITICAL** — Immediate action required
- Examples: Exposed API keys, expired SSL cert, open admin panels
- SLA: Fix within 24 hours
- Risk: Active exploitation likely

**HIGH** — Fix within 72 hours  
- Examples: Missing HSTS, known CVEs in dependencies
- Risk: Significant attack surface increase

**MEDIUM** — Fix within 2 weeks
- Examples: Missing security headers, outdated packages
- Risk: Defense-in-depth weaknesses

**INFO** — Informational findings
- Examples: Discovered subdomains, open ports
- Action: Review and document

**PASS** — Checks you're passing
- Celebrate these! Keep monitoring.

### The Score Formula
```
Final Score = (Website × 0.4) + (App × 0.35) + (Codebase × 0.25)

A: 85-100  — Well secured
B: 70-84   — Good posture  
C: 55-69   — Moderate risk
D: 40-54   — High risk
F: 0-39    — Critical vulnerabilities
```

### False Positive Handling
If a finding is incorrect, click **Mark as False Positive** on the finding. This suppresses it from future scans and removes it from your score calculation."""
            }
        ]
    },
    {
        "id": "api-docs",
        "icon": "◈",
        "color": "#00cec9",
        "title": "API Documentation",
        "desc": "Integrate Sentinel's intelligence into your existing infrastructure.",
        "articles": [
            {
                "title": "Getting started with the API",
                "content": """## SecurePulse API — Getting Started

### Base URL
```
https://api.securepulse.io/v2
```

### Authentication
All API requests require a Bearer token in the Authorization header:
```http
Authorization: Bearer sp_live_your_api_key_here
Content-Type: application/json
```

Get your API key from **Settings → API → Generate Key**

### Quick Start: Run a Scan
```python
import requests

response = requests.post(
    "https://api.securepulse.io/v2/scan",
    headers={"Authorization": "Bearer sp_live_xxxxx"},
    json={
        "website_url": "https://yoursite.com",
        "app_url": "https://yourapp.com",
        "repo_url": "https://github.com/org/repo"
    }
)

results = response.json()
print(f"Score: {results['final']['score']}/100")
print(f"Grade: {results['final']['grade']}")
```

### Rate Limits
| Plan | Requests/hour | Concurrent scans |
|------|--------------|-----------------|
| Free | 10 | 1 |
| Pro | 100 | 5 |
| Enterprise | Unlimited | 20 |

### Webhooks
Register a webhook to receive scan results asynchronously:
```json
POST /v2/webhooks
{
  "url": "https://yourserver.com/securepulse-webhook",
  "events": ["scan.completed", "scan.critical_found"],
  "secret": "your_webhook_secret"
}
```"""
            },
            {
                "title": "API reference — all endpoints",
                "content": """## API Reference

### Endpoints

#### POST /scan
Run a security scan.

**Request Body:**
```json
{
  "website_url": "string (optional)",
  "app_url": "string (optional)",  
  "repo_url": "string (optional)"
}
```
At least one URL required.

**Response:**
```json
{
  "final": {
    "score": 78,
    "grade": "B",
    "message": "Good posture — a few improvements needed",
    "color": "teal"
  },
  "scores": {
    "website": 85,
    "app": 70,
    "codebase": 75
  },
  "findings": [...]
}
```

---

#### GET /scan/{scan_id}
Retrieve a previous scan result.

---

#### GET /scans
List all scans for your account.

**Query Params:** `?limit=20&offset=0&grade=F`

---

#### POST /chat
Query the AI security advisor.

```json
{
  "messages": [{"role": "user", "content": "How do I fix HSTS?"}],
  "scan_context": {"score": 72, "grade": "B"}
}
```

---

#### GET /status
System status and component health.

---

#### POST /ticket
Create a support ticket.
```json
{
  "name": "string",
  "email": "string", 
  "subject": "string",
  "priority": "low|medium|high|critical",
  "description": "string"
}
```"""
            }
        ]
    },
    {
        "id": "billing",
        "icon": "🪙",
        "color": "#fdcb6e",
        "title": "Billing & Plans",
        "desc": "Review enterprise tier features and resource allocation.",
        "articles": [
            {
                "title": "Compare plans",
                "content": """## Plans & Pricing

### Available Plans

#### Free
- 10 scans/month
- Website + App scanning
- Email notifications
- 7-day scan history
- Community support

#### Pro — $49/month
- 100 scans/month
- All scan types including codebase
- Scheduled automated scans
- API access (100 req/hr)
- Slack/Teams integrations
- Priority support (< 4hr response)
- 90-day scan history

#### Enterprise — Custom pricing
- Unlimited scans
- White-label reports
- SSO/SAML integration
- Dedicated security engineer
- SLA guarantees (99.9% uptime)
- On-premise deployment option
- Custom integrations
- 24/7 phone support

### Upgrading Your Plan
1. Go to **Settings → Billing**
2. Click **Upgrade Plan**
3. Select your plan
4. Enter payment details (Stripe-secured)
5. Upgrade takes effect immediately

### Enterprise Inquiries
Contact sales@securepulse.io or book a demo at calendly.com/securepulse-sales"""
            }
        ]
    },
    {
        "id": "incident-response",
        "icon": "⚠️",
        "color": "#d63031",
        "title": "Incident Response",
        "desc": "What to do when a Level 5 breach is detected in your network subnet.",
        "articles": [
            {
                "title": "Incident response playbook",
                "content": """## Incident Response Playbook

### Severity Classification

| Level | Description | Response Time |
|-------|-------------|---------------|
| L1 | Informational finding | 72 hours |
| L2 | Low-impact vulnerability | 48 hours |
| L3 | Active attack attempt | 24 hours |
| L4 | Successful intrusion | 4 hours |
| L5 | Critical breach / data exfiltration | Immediate |

### L5 Breach Response Protocol

#### T+0: Detection
- SecurePulse generates CRITICAL alert
- Automated IP block triggers on WAF
- Incident ticket auto-created

#### T+15 minutes: Containment
```
1. ISOLATE affected systems from network
2. PRESERVE logs — do NOT wipe or restart
3. REVOKE all API keys and sessions
4. NOTIFY security team via emergency channel
```

#### T+1 hour: Assessment
- Identify attack vector from scan logs
- Determine data accessed/exfiltrated
- Scope blast radius

#### T+4 hours: Eradication
- Remove malicious code/backdoors
- Patch exploited vulnerability
- Rotate all credentials
- Restore from clean backup

#### T+24 hours: Recovery & Reporting
- Verify system integrity
- Document timeline
- File breach report if PII involved (GDPR: 72hr deadline)
- Post-mortem analysis

### Emergency Contacts
- Security Hotline: +1-800-PULSE-911
- Email: incident@securepulse.io
- Slack: #incident-response channel"""
            },
            {
                "title": "View Protocols →",
                "content": """## Security Protocols Reference

### Authentication Protocols
- **MFA Enforcement**: All admin accounts require hardware key or TOTP
- **Session Management**: 24-hour token expiry, device fingerprinting
- **Zero Trust**: Every request authenticated regardless of network origin

### Data Protection
- AES-256 encryption at rest
- TLS 1.3 in transit
- Key rotation every 90 days
- No scan data stored beyond retention policy

### Access Control
- RBAC (Role-Based Access Control) with 5 levels
- Principle of least privilege enforced
- All privileged actions audit-logged

### Compliance
- SOC 2 Type II certified
- GDPR compliant
- ISO 27001 aligned
- Regular penetration testing by third-party firms"""
            }
        ]
    }
]

# ── AI-powered search ──────────────────────────────────────────

async def search_knowledge_base(query: str) -> dict:
    """Use AI to search and answer from the knowledge base."""
    if not GROQ_API_KEY:
        return {"answer": "AI search requires GROQ_API_KEY.", "articles": []}

    # Build context from all articles
    kb_context = ""
    for domain in KNOWLEDGE_DOMAINS:
        for article in domain["articles"]:
            kb_context += f"\n\n### {domain['title']}: {article['title']}\n{article['content'][:800]}"

    system = """You are a helpful support agent for SecurePulse, a security scanning platform.
Answer the user's question using the knowledge base provided. Be concise and actionable.
Format your response in markdown. If the question isn't covered, say so and suggest contacting support."""

    prompt = f"""Knowledge Base:{kb_context}

User Question: {query}

Provide a helpful, concise answer (max 200 words). Use markdown formatting."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "max_tokens": 400,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ]
            }
        )
        response.raise_for_status()
        data = response.json()
        answer = data["choices"][0]["message"]["content"]

    # Find relevant articles
    query_lower = query.lower()
    relevant = []
    for domain in KNOWLEDGE_DOMAINS:
        for article in domain["articles"]:
            if any(word in article["title"].lower() or word in article["content"].lower()
                   for word in query_lower.split() if len(word) > 3):
                relevant.append({
                    "domain": domain["title"],
                    "domain_id": domain["id"],
                    "title": article["title"],
                    "color": domain["color"]
                })

    return {"answer": answer, "articles": relevant[:3]}


# ── Live Chat (AI-powered) ─────────────────────────────────────

async def get_live_chat_response(messages: list) -> str:
    if not GROQ_API_KEY:
        return "Live chat requires a GROQ_API_KEY. Please configure it in your .env file."

    system = """You are a live support agent for SecurePulse, a web security scanning platform.
You help users with:
- Understanding scan results and vulnerabilities
- Setting up and configuring the platform
- Billing and account questions
- Incident response guidance
- API integration help

Be friendly, professional, and concise. Use bullet points for steps.
If asked about something outside your scope, offer to create a support ticket."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "max_tokens": 300,
                "messages": [
                    {"role": "system", "content": system},
                    *messages
                ]
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]