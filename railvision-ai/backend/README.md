# RailVision AI — Backend Inference Service

> YOLO-powered video analysis backend built with **FastAPI**, **PyTorch**, and **OpenCV**.
> Upload an MP4 → get annotated video + structured JSON detections.

---

## Architecture

```
backend/
├── main.py                  # FastAPI entry point & lifespan
├── requirements.txt
├── .env.example             # Environment variable template
│
├── app/
│   ├── config.py            # Pydantic-settings configuration
│   ├── api/
│   │   └── routes.py        # All HTTP endpoints
│   ├── models/
│   │   └── schemas.py       # Pydantic request / response schemas
│   ├── services/
│   │   ├── model_service.py # Singleton YOLO model loader
│   │   └── video_service.py # Frame-by-frame inference pipeline
│   └── utils/
│       └── file_utils.py    # File validation & path helpers
│
├── uploads/                 # Uploaded source videos
├── outputs/                 # Annotated output videos
└── weights/                 # YOLO model weights (auto-downloaded)
```

## Quick Start

### 1. Create a virtual environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # macOS / Linux
# .venv\Scripts\activate     # Windows
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. (Optional) Configure environment

```bash
cp .env.example .env
# Edit .env to change device, confidence, etc.
```

### 4. Run the server

```bash
uvicorn main:app --reload
```

The server starts at **http://localhost:8000**.
Interactive API docs at **http://localhost:8000/docs**.

> **First run:** YOLO weights (`yolo11n.pt`) are auto-downloaded into `weights/`.

---

## API Endpoints

| Method | Path              | Description                        |
| ------ | ----------------- | ---------------------------------- |
| POST   | `/upload`         | Upload a video file                |
| POST   | `/process`        | Run YOLO inference on the video    |
| GET    | `/result/{id}`    | Download the annotated video       |
| GET    | `/health`         | Health / readiness check           |

### Typical workflow

```bash
# 1. Upload
curl -X POST http://localhost:8000/upload \
  -F "file=@sample.mp4"
# → { "video_id": "a1b2c3d4e5f6", ... }

# 2. Process
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"video_id": "a1b2c3d4e5f6"}'
# → { "status": "success", "detections": [...], ... }

# 3. Download result
curl -O http://localhost:8000/result/a1b2c3d4e5f6
```

### Detection JSON shape

```json
{
  "status": "success",
  "video": "a1b2c3d4e5f6_processed.mp4",
  "frames": 1240,
  "processing_time": 24.8,
  "fps": 51.0,
  "detections": [
    {
      "frame": 52,
      "class": "person",
      "confidence": 0.94,
      "bbox": [100, 210, 340, 580]
    }
  ]
}
```

---

## Configuration

All settings can be overridden via environment variables or a `.env` file:

| Variable              | Default       | Description                        |
| --------------------- | ------------- | ---------------------------------- |
| `MODEL_NAME`          | `yolo11n.pt`  | YOLO weights filename              |
| `MODEL_CONFIDENCE`    | `0.40`        | Min detection confidence           |
| `MODEL_IOU_THRESHOLD` | `0.45`        | NMS IoU threshold                  |
| `MODEL_DEVICE`        | `cpu`         | `cpu`, `cuda`, or `mps`            |
| `MAX_UPLOAD_SIZE_MB`  | `500`         | Max upload size in megabytes       |
| `DEBUG`               | `false`       | Enable debug logging               |

---

## Device Support

| Device         | Set `MODEL_DEVICE` to | Notes                     |
| -------------- | --------------------- | ------------------------- |
| CPU            | `cpu`                 | Default, works everywhere |
| NVIDIA GPU     | `cuda`                | Requires CUDA + cuDNN     |
| Apple Silicon  | `mps`                 | macOS 13+ with M1/M2/M3  |

---

## Tech Stack

- **FastAPI** — async HTTP framework
- **Ultralytics YOLO** — object detection (YOLOv11)
- **PyTorch** — deep learning runtime
- **OpenCV** — video I/O and frame manipulation
- **Pydantic v2** — data validation & serialisation
