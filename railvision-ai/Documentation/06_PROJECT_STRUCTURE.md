# Project Structure

The RailVision AI project is a monorepo containing both the Next.js frontend and the FastAPI backend. Below is the comprehensive tree of the implemented architecture:

## Root Directory (`railvision-ai/`)

```text
railvision-ai/
├── src/                      # [IMPLEMENTED] Next.js Frontend source code
│   ├── app/                  # Next.js 13+ App Router pages (e.g., dashboard, alerts)
│   ├── components/           # Reusable React components (UI, layout, charts)
│   │   ├── dashboard/        # Complex widgets (Sidebar, PipelineBar)
│   │   └── landing/          # Landing page components (RailwayCanvas)
│   ├── store/                # Zustand global state stores (useShallow optimized)
│   └── lib/                  # Frontend utilities (API fetchers, GSAP configs)
│
├── backend/                  # [IMPLEMENTED] FastAPI AI Backend
│   ├── app/                  # Main backend application logic
│   │   ├── main.py           # Application entry point & lifespan events
│   │   ├── config.py         # Pydantic configuration & environment variables
│   │   ├── api/              # RESTful API Endpoints
│   │   │   └── routes.py     # Definitions for /upload, /process, /query, etc.
│   │   ├── ai/               # The AI Modules (Core Logic)
│   │   │   ├── base/         # ModuleRegistry and BaseAIModule interfaces
│   │   │   ├── person/       # YOLOv11 inference logic
│   │   │   ├── crowd/        # Crowd density and heatmap algorithms
│   │   │   ├── crime/        # Loitering, intrusion, and running detection
│   │   │   └── worker/       # PPE and worker attendance checks
│   │   ├── services/         # Orchestration & Integration
│   │   │   ├── video_service.py      # Inference loop and frame skipping
│   │   │   ├── knowledge_base.py     # Serializes detections to JSON ledgers
│   │   │   ├── context_builder.py    # Prepares Qwen prompts from JSONs
│   │   │   └── llm_service.py        # Local Qwen 3 (HuggingFace) execution
│   │   └── utils/            # Helper functions (file path sanitization)
│   │
│   ├── weights/              # Downloaded PyTorch models (.pt, .onnx)
│   ├── uploads/              # Temporary storage for raw user video uploads
│   └── outputs/              # Storage for processed MP4s and Knowledge Base JSONs
│
├── Documentation/            # [IMPLEMENTED] This SIH Documentation System
├── package.json              # Frontend Node dependencies (Next, Tailwind, Zustand)
└── README.md                 # Brief project introduction
```

## Data Storage Strategy
The system avoids complex SQL databases for the hackathon prototype. Instead, it relies on a local **File-based Knowledge Base** approach:
1. Videos are uploaded to `backend/uploads/{uuid}_filename.mp4`.
2. AI processing creates a specific directory: `backend/outputs/{uuid}/`.
3. The processed video is saved as `backend/outputs/{uuid}/annotated.mp4`.
4. The semantic Knowledge Base is saved as `backend/outputs/{uuid}/report/summary.json`, `events.json`, etc.
5. The `ContextBuilder` reads these specific JSON files directly from disk when a user asks the LLM a question.
