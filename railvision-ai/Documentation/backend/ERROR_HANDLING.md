# Backend Error Handling & Resilience

**Status**: [IMPLEMENTED]

## 1. Exception Hierarchy
All application errors inherit from custom base exceptions or standard FastAPI `HTTPException`.

```python
class VideoProcessingError(Exception):
    """Raised when OpenCV or PyTorch encounters an unrecoverable frame error."""

class ModelLoadError(Exception):
    """Raised when YOLO or Qwen weights fail to load from disk/HF."""
```

## 2. API Response Standard
All HTTP errors return a standardized JSON body conforming to `ErrorResponse`:

```json
{
  "status": "error",
  "detail": "No uploaded video found for id 'vid_invalid99'.",
  "error_code": "FILE_NOT_FOUND",
  "timestamp": "2026-08-09T14:45:00Z"
}
```

## 3. Graceful Degradation
- If `transformers` is not installed or VRAM runs out, the `LLMService` gracefully disables itself and returns pre-formatted fallback summaries rather than crashing the API server.
- If an individual AI module fails during frame processing, it logs the exception and allows the remaining modules in `ModuleRegistry` to complete execution.
