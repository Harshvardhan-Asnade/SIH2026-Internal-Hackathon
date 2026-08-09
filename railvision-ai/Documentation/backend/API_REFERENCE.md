# Complete API Reference

Base URL: `http://localhost:8000`

---

### 1. `POST /upload`
**Description**: Accepts a raw surveillance video.
**Payload**: `multipart/form-data`
- `file`: The `.mp4`, `.avi`, or `.mov` file.
**Response**:
```json
{
  "status": "success",
  "video_id": "vid_123abc",
  "filename": "vid_123abc_cctv.mp4"
}
```

---

### 2. `POST /process`
**Description**: Triggers the AI inference loop. Blocks until the annotated video and JSON ledgers are fully generated.
**Payload**: `application/json`
```json
{
  "video_id": "vid_123abc",
  "confidence": 0.3
}
```
**Response**:
```json
{
  "video_id": "vid_123abc",
  "status": "completed",
  "ai_master_report": "The AI generated summary text..."
}
```

---

### 3. `GET /result/{video_id}`
**Description**: Returns the processed, annotated video stream.
**Response**: `video/mp4` stream.

---

### 4. `POST /query`
**Description**: Ask the AI Master a question about the processed footage.
**Payload**: `application/json`
```json
{
  "video_id": "vid_123abc",
  "query": "Was anyone loitering near the tracks?"
}
```
**Response**:
```json
{
  "status": "success",
  "answer": "Yes, one individual was detected loitering in Zone A for 45 seconds.",
  "confidence": "High"
}
```
