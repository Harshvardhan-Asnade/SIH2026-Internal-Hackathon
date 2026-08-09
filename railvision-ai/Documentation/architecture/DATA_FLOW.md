# Data Flow Architecture

The journey of a video frame from raw pixels to natural language intelligence:

```mermaid
graph TD
    A[Raw MP4 Upload] --> B(OpenCV Frame Extraction)
    B --> C{Frame Skip Check?}
    C -->|Skip| D[Copy Previous Bboxes]
    C -->|Process| E[YOLOv11 Inference]
    E --> F[(Shared Context Dict)]
    
    F --> G[Crowd Module]
    F --> H[Crime Module]
    F --> I[Worker Module]
    
    G --> J[Knowledge Base Serialization]
    H --> J
    I --> J
    
    J --> K[timeline.json]
    J --> L[summary.json]
    J --> M[events.json]
    
    K --> N[Context Builder]
    L --> N
    M --> N
    
    N --> O((Qwen 3 LLM))
    O --> P[Final Frontend Report]
```

## Knowledge Base Translation
The most critical part of this flow is **J -> K,L,M**. Raw pixel coordinates mean nothing to an LLM. The AI modules must translate geometric data (e.g., "Box moved 50px right over 3 seconds") into semantic data (e.g., "Person loitering in Zone A") before it is written to the JSON logs.
