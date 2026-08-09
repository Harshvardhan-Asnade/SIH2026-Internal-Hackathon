# RailVision AI – Exhaustive Project Details
**Smart India Hackathon (SIH1349)**

This document provides a highly comprehensive breakdown of every aspect of the RailVision AI project. It is intended for developers, system architects, and technical evaluators who need to understand the intricate workings of the system.

---

## 1. Complete Project Overview
RailVision AI is an AI-powered CCTV Analytics Platform built for Indian Railways. Its purpose is to process video feeds, extract critical intelligence (crowd density, crimes, worker safety), and allow operators to query this intelligence naturally using a conversational LLM. 

Unlike traditional static dashboards, RailVision AI functions as an "AI Command Center" that not only displays data but understands it, providing executive summaries and actionable insights in real-time.

---

## 2. Full Directory Structure & File Manifest

### Frontend (`/src`)
- `app/`
  - `globals.css`: Tailwind configuration and global styles (dark theme, fonts).
  - `layout.tsx`: Root layout wrapping the application.
  - `dashboard/`
    - `page.tsx`: The primary Command Center layout orchestrating all UI components.
    - `layout.tsx`: Dashboard layout wrapper.
- `components/`
  - `ErrorBoundary.tsx`: Catches and handles UI crashes gracefully.
  - `dashboard/`
    - `Sidebar.tsx`: Handles video uploads, drag-and-drop, and the primary Action CTA.
    - `TopHeader.tsx`: Displays branding, time, and global system status.
    - `VideoWorkspace.tsx`: Custom video player with synchronized bounding box overlays, strict aspect ratios, and an interactive event timeline.
    - `AIAssistant.tsx`: The chat interface communicating with Qwen 3, featuring markdown rendering and intelligent auto-scrolling.
    - `KPIRow.tsx`: Displays top-level metrics (Risk Score, Active Alerts, Processing FPS).
    - `DynamicTabs.tsx`: The core data visualization area with tabs for Overview, Crowd, Crime, Workers, Alerts, Timeline, Analytics, and PDF/CSV Exports.
    - `PipelineStatus.tsx`: A visual progress bar tracking the 7 stages of AI processing.
- `lib/`
  - `api-service.ts`: Handles all Axios requests to the FastAPI backend (`/upload`, `/process`, `/query`).
  - `store.ts`: The central Zustand state manager holding video state, chat history, processing results, and UI toggles.
  - `api-types.ts`: TypeScript interfaces matching the Pydantic models from the backend.
  - `export-pdf.ts`: Logic for generating and downloading structured PDF reports using `jsPDF`.

### Backend (`/backend`)
- `main.py`: The FastAPI entry point setting up CORS and routing.
- `app/`
  - `config.py`: Environment variables, paths, and model settings.
  - `api/`
    - `routes.py`: Contains the three primary endpoints (`/upload`, `/process`, `/query`).
  - `models/`
    - `schemas.py`: Pydantic models (e.g., `ProcessingResult`, `CrowdAnalysis`, `CrimeDetection`).
  - `services/`
    - `ai_pipeline.py`: The core orchestrator that runs YOLO and ByteTrack on video frames.
    - `knowledge_base.py`: The "Knowledge Base Builder" that compresses raw detection arrays into semantic JSON summaries (`crowd.json`, `crime.json`, `alerts.json`, etc.).
    - `context_builder.py`: The "Context Builder" that reads the Knowledge Base, routes the user's intent, and constructs a token-efficient prompt.
    - `llm_service.py`: Initializes the HuggingFace pipeline for Qwen 3 and executes inference based on the Context Builder's prompt.
- `models/`: Directory where the YOLO `.pt` weights and LLM model files are stored/cached.
- `outputs/`: Directory where processed videos, extracted JSON reports, and debug logs are saved permanently.

---

## 3. Detailed Architecture

The system operates on an asynchronous **Extraction → Compression → RAG (Retrieval-Augmented Generation)** architecture.

### A. The Processing Pipeline
1. **Upload (`/upload`)**: Video is saved to disk and a unique `video_id` is generated.
2. **Inference (`/process`)**: `ai_pipeline.py` loops through video frames. YOLOv11 detects entities. ByteTrack assigns persistent IDs.
3. **Structuring**: Raw detections are grouped into semantic structures (e.g., tracking a person across 50 frames becomes a single `TrackedPerson` entity).
4. **Knowledge Base Generation**: `knowledge_base.py` aggregates the data to calculate peak crowd density, total incidents, and worker safety scores. It saves this as 15 distinct JSON files inside `/outputs/{video_id}/report/`.

### B. The Conversational LLM Pipeline (RAG)
1. **Query Formulation (`/query`)**: The user asks a question via `AIAssistant.tsx`.
2. **Intent Routing**: `context_builder.py` analyzes the question and determines the category (e.g., "crime", "crowd", "summary").
3. **Context Injection**: 
   - A base context is *always* included (Executive Summary, Alert counts, basic stats).
   - If the category is "crowd", the system reads `crowd.json` and injects specific data (zone breakdowns, heatmaps).
   - *This strict compression prevents the LLM from exceeding token limits (usually kept under 1500 tokens).*
4. **Inference**: Qwen 3 receives the system prompt + injected context + user question, generating a highly accurate answer.
5. **Debug Mode**: Every query saves a `debug_prompt.md` and `context_used.json` to the outputs folder for auditing.

---

## 4. API Endpoints

### `POST /upload`
- **Payload**: `multipart/form-data` containing the video file.
- **Action**: Saves the file, ensures it's a valid video format.
- **Returns**: `{"video_id": "uuid", "status": "uploaded", "filename": "file.mp4"}`

### `POST /process`
- **Payload**: `{"video_id": "uuid"}`
- **Action**: Executes YOLO and ByteTrack. Generates overlays. Builds the Knowledge Base.
- **Returns**: The complete `ProcessingResult` JSON (summarized for frontend consumption).

### `GET /video/{video_id}/result`
- **Action**: Streams the final processed MP4 video (with drawn bounding boxes) back to the frontend using `FileResponse`.

### `POST /query`
- **Payload**: `{"query": "string", "context": { ... }}`
- **Action**: Routes the query, builds the prompt, executes Qwen 3.
- **Returns**: `{"answer": "string", "status": "success", "confidence": "High"}`

---

## 5. UI/UX Specifications & Styling

### Design Language
- **Theme**: Deep Dark Mode (`#070707`, `#111111`, `#0c0c0c`).
- **Accent Colors**: 
  - Brand/Primary: `#B8FF3B` (Neon Green/Yellow)
  - Critical/Error: `#FF4D4D` (Red)
  - Warning/Crime: `#FF7A00` (Orange)
  - Success/Safety: `#33FF99` (Mint Green)
- **Grid System**: Strict **8px** spatial system. All padding and margins use multiples of 4 (e.g., `p-4` = 16px, `p-6` = 24px, `gap-4`).
- **Glassmorphism**: Components use low opacity borders (`border-white/5`) and subtle background opacities (`bg-[rgba(255,255,255,0.05)]`) to create depth without solid colors.

### State Management (Zustand)
The entire application operates as a Single Page Application (SPA) without hard refreshes. Zustand manages:
- `pipelineStage`: Tracks the 7 stages of AI processing (`upload` -> `extraction` -> `detection` -> `tracking` -> `analysis` -> `alerts` -> `report`).
- `jumpToFrameTrigger`: Allows the Timeline and DynamicTabs to command the VideoWorkspace to seek to a specific frame.
- `chatMessages`: Maintains the history of the conversation with the LLM.

---

## 6. Business Logic & Feature Specifications

### Crowd Analytics
- **Density Calculation**: Based on the ratio of detected people to total frame area. Categorized as Low, Medium, High, or Critical.
- **Zone Breakdown**: The system divides the frame into a 3x3 grid to identify congregation hotspots.

### Crime Detection
Detects specific scenarios using spatial reasoning:
- **Track Intrusion**: Person detected overlapping with a predefined "Railway Track" polygon.
- **Abandoned Baggage**: A "bag" class object remaining stationary without a "person" class object nearby for a specific frame duration.
- **Loitering**: A person remaining in a localized area for an extended time.
- **Running/Panic**: Sudden, coordinated acceleration of multiple bounding boxes.

### Worker Monitoring
- **PPE Verification**: Identifies personnel. Uses secondary detection layers to verify the presence of a "helmet" and "high-vis jacket".
- **Safety Score**: Calculated based on the percentage of workers fully compliant with PPE regulations.

### Alerting System
Alerts are unified from all modules into a single stream.
- **Critical**: Track intrusions, fights, severe crowd panic.
- **High**: Abandoned baggage, zero-compliance workers in dangerous zones.
- **Medium**: Loitering, minor crowd congestion.
- **Low**: General statistical anomalies.

---

## 7. Performance & Optimization Metrics

- **Component Rendering**: Extensively utilizes React `useMemo` and `useCallback` to prevent re-rendering the heavy VideoWorkspace when the AIAssistant updates.
- **LLM Optimization**: `max_new_tokens` is configured to 1024 to ensure comprehensive reports, while `temperature=0.4` prevents hallucination and ensures factual grounding in the JSON context.
- **Frontend Build**: The Next.js production build utilizes Turbopack and static generation where possible, compiling in ~2 seconds.
