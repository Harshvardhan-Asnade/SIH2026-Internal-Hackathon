# Worker Monitoring Module

**Status**: [PARTIALLY IMPLEMENTED]
**File**: `app/ai/worker/module.py`

## 1. Current Implementation
The current FastAPI backend relies on class filtering from the base YOLO model to identify staff (e.g., proxying high-visibility vest classes or utilizing predefined "Staff Only" polygon zones).

## 2. Planned Full Implementation
To achieve true individual attendance tracking:
1. We will integrate **InsightFace**.
2. When a worker enters the frame, their face will be cropped and converted into a 512-dimensional embedding vector.
3. This vector will be compared against a local FAISS or ChromaDB database containing the registered embeddings of railway staff.
4. This will allow the LLM to report: "Worker John Doe was present in Zone B."
