# RailVision AI — Mobile Camera Connection Guide

## Why `localhost` Fails on a Phone

When the QR code encodes `http://localhost:3000/mobile-camera?session=...`, the phone interprets `localhost` as **itself** (the phone's own loopback adapter), not the Mac running the server. The page will either:
- Not load at all ("This site can't be reached")
- Load but the WebSocket will also fail (`ws://localhost:8000` → connects to phone's own port 8000, which is closed)

Additionally, `navigator.mediaDevices.getUserMedia()` requires a **secure context (HTTPS)** on most modern mobile browsers when the origin is not `localhost`. An HTTP connection from a phone will be blocked by the browser.

## Solution Architecture

```
PHONE BROWSER
     │
     │ opens QR URL (HTTPS or LAN IP)
     ▼
NEXT.JS FRONTEND  ◄── receives /mobile-camera?session=SESSION_ID
     │
     │ WebSocket (wss:// or ws://MAC_IP)
     ▼
FASTAPI BACKEND  (0.0.0.0:8000)
     │
     ▼
YOLO26 + ByteTrack
     │
     ▼
LAPTOP WEBSOCKET RECEIVER
     │
     ▼
RailVision Dashboard
```

---

## METHOD A: Same Wi-Fi LAN (HTTP)

> **Note:** Camera permissions may still be blocked over plain HTTP on iOS Safari and Chrome. If they are, use Method B (HTTPS tunnel).

### Step 1 — Find Your Mac's LAN IP

```bash
ipconfig getifaddr en0
# Example output: 192.168.1.105  or  10.97.155.5
```

### Step 2 — Configure `.env.local`

Edit `railvision-ai/.env.local`:

```env
NEXT_PUBLIC_MOBILE_CAMERA_URL=http://10.97.155.5:3000
NEXT_PUBLIC_API_URL=http://10.97.155.5:8000
```

> Replace `10.97.155.5` with your actual LAN IP from Step 1.

### Step 3 — Start Frontend (bind to all interfaces)

```bash
cd railvision-ai
npm run dev -- --hostname 0.0.0.0
```

This makes the dev server accessible at `http://MAC_LAN_IP:3000` from other devices on the same Wi-Fi.

### Step 4 — Start Backend (bind to all interfaces)

```bash
cd railvision-ai/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5 — Test

1. Open `http://MAC_LAN_IP:3000/dashboard` on your Mac
2. Click **Connect Phone Camera**
3. Scan the QR code with your phone
4. Phone should open `http://MAC_LAN_IP:3000/mobile-camera?session=...`
5. Tap **Start** — if camera permission is blocked, switch to Method B

---

## METHOD B: HTTPS Tunnel (Recommended — Full Camera Access)

This method exposes your Mac via a public HTTPS URL, satisfying the browser's security context requirement for camera access.

### Option B1: ngrok

```bash
# Install ngrok: https://ngrok.com/download
# Then authenticate once: ngrok config add-authtoken YOUR_TOKEN

# Expose Next.js frontend
ngrok http 3000
# → Forwarding: https://abcd1234.ngrok-free.app

# In a separate terminal, expose FastAPI backend
ngrok http 8000
# → Forwarding: https://efgh5678.ngrok-free.app
```

### Option B2: Cloudflare Tunnel (free, no account required for temporary tunnels)

```bash
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Expose Next.js frontend
cloudflared tunnel --url http://localhost:3000
# → https://xxx.trycloudflare.com

# Expose FastAPI backend
cloudflared tunnel --url http://localhost:8000
# → https://yyy.trycloudflare.com
```

### Configure `.env.local` with Tunnel URLs

```env
NEXT_PUBLIC_MOBILE_CAMERA_URL=https://abcd1234.ngrok-free.app
NEXT_PUBLIC_API_URL=https://efgh5678.ngrok-free.app
```

> **Important:** Tunnel URLs change every time you restart ngrok/cloudflared (unless you have a paid/reserved domain). Always update `.env.local` and restart the dev server after getting new tunnel URLs.

### Start Services

```bash
# Terminal 1: Frontend
cd railvision-ai
npm run dev

# Terminal 2: Backend  
cd railvision-ai/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Frontend tunnel
ngrok http 3000

# Terminal 4: Backend tunnel
ngrok http 8000
```

---

## QR Code URL Format

The QR code is generated from:
```
NEXT_PUBLIC_MOBILE_CAMERA_URL + "/mobile-camera?session=" + SESSION_ID
```

**Valid examples:**
```
https://abcd1234.ngrok-free.app/mobile-camera?session=abc-123-def
http://10.97.155.5:3000/mobile-camera?session=abc-123-def
```

**Invalid (will NOT work on phone):**
```
http://localhost:3000/mobile-camera?session=...   ← BROKEN
http://127.0.0.1:3000/mobile-camera?session=...  ← BROKEN
```

The dashboard will show a ⚠️ warning if the configured URL contains `localhost` or `127.0.0.1`.

---

## Phone WebSocket URL

The phone's browser opens a WebSocket to the FastAPI backend:
```
wss://BACKEND_TUNNEL/ws/mobile-camera/phone/SESSION_ID
```

This is derived from `NEXT_PUBLIC_API_URL` automatically. **Never `ws://localhost:8000` from the phone.**

---

## Camera Settings

| Setting | Value |
|---------|-------|
| Capture resolution | 1280×720 (from hardware) |
| AI transmission resolution | 640×360 (downscaled before send) |
| JPEG quality | 65% |
| Frame rate | Up to 30fps, backpressure-limited by backend ACK |
| Facing mode | Rear camera preferred (`facingMode: { ideal: "environment" }`) |

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "This site can't be reached" | QR has `localhost` | Set `NEXT_PUBLIC_MOBILE_CAMERA_URL` to LAN IP or tunnel URL |
| "Camera requires HTTPS" | Phone opened HTTP URL | Use Method B (HTTPS tunnel) |
| "Camera Access Denied" | Browser permissions blocked | Tap address bar → allow camera → refresh |
| WebSocket fails | Backend not on `0.0.0.0` or wrong tunnel URL | Check `NEXT_PUBLIC_API_URL` and backend binding |
| QR shows warning badge | Env var not set or still `localhost` | Update `.env.local` and restart `npm run dev` |

---

## Validation Checklist

- [ ] `NEXT_PUBLIC_MOBILE_CAMERA_URL` does not contain `localhost`
- [ ] QR payload verified in browser devtools — no localhost
- [ ] Phone can open the QR URL in browser
- [ ] HTTPS / secure context confirmed (`window.isSecureContext === true`)
- [ ] Camera permission granted on phone
- [ ] Rear camera starts
- [ ] WebSocket `CONNECTED` indicator appears
- [ ] Dashboard shows `LIVE FEED` in header
- [ ] Pipeline tracker turns red (live mode)
- [ ] YOLO26 detections appear in analytics tabs
- [ ] ByteTrack IDs shown
- [ ] Latency displayed in dashboard
- [ ] Stop Camera releases phone camera hardware
