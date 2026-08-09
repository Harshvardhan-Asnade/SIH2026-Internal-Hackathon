# AI Engine Known Limitations

While RailVision AI is highly performant, real-world deployment presents technical challenges:

## 1. Computer Vision Limitations
- **Severe Occlusion**: In extreme rush-hour crowds (Platform density $> 4 \text{ people}/m^2$), individual person bounding boxes overlap heavily, leading to track loss and undercounting.
- **Lighting Dynamics**: Direct sunlight glare on outdoor tracks or low-light night footage degrades YOLO detection confidence.
- **Single-Camera Perspective**: Bounding box overlap calculations do not account for camera depth without calibration.

## 2. LLM Limitations (Qwen 0.5B)
- **Token Horizon**: Using a 0.5B parameter model provides ultra-fast CPU inference but has weaker multi-step logical reasoning compared to a 70B model.
- **Hallucination Risk**: If a user asks about events outside the video timeframe, the model may occasionally synthesize details if not strictly constrained by the system prompt.

## 3. Hardware Constraints
- Running YOLO and Qwen simultaneously on pure CPU systems (without MPS/CUDA) introduces 15–30 second latency per video processing request.
