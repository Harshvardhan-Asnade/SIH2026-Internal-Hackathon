# File Storage Architecture

RailVision AI uses a deterministic local directory storage layout.

## Directory Structure
```text
backend/
├── uploads/
│   └── {video_id}_{original_filename}.mp4
└── outputs/
    └── {video_id}/
        ├── annotated.mp4           # Output annotated video
        ├── crowd_heatmap.png       # Generated density heatmap
        └── report/                 # Knowledge Base directory
            ├── summary.json
            ├── crowd.json
            ├── crime.json
            ├── worker.json
            ├── alerts.json
            ├── timeline.json
            ├── events.json
            ├── statistics.json
            ├── recommendations.json
            └── objects.json
```

## Cleaning Policy
Temporary files in `uploads/` and `outputs/` can be purged via standard lifecycle scripts. `video_id` UUID strings ensure zero collision between concurrent users.
