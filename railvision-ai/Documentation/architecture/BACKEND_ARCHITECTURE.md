# Backend Architecture Details

The FastAPI backend is not just an API server; it is a full **AI Orchestration Engine**.

## 1. The Singleton `ModuleRegistry`
Located in `app/ai/base/module_registry.py`, this class manages the lifecycle of all AI models.
During the FastAPI `lifespan` event (when the server starts), the registry initializes:
- `PersonDetectionModule`
- `CrowdAnalysisModule`
- `CrimeDetectionModule`
- `WorkerMonitoringModule`

## 2. Asynchronous Video Processing
Video processing is inherently a synchronous, CPU/GPU-blocking task (due to OpenCV and PyTorch).
To prevent the FastAPI event loop from freezing (which would crash the frontend dashboard), the endpoint `/process` uses:
```python
await asyncio.to_thread(process_video, ...)
```
This offloads the heavy AI loop to a background OS thread, keeping the API responsive for concurrent health checks and LLM queries.

## 3. Memory Management
The backend utilizes `torch.no_grad()` across all inference steps to prevent PyTorch from building gradient graphs, saving massive amounts of VRAM.
