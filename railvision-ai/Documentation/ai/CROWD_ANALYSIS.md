# Crowd Analysis Module

**Status**: [IMPLEMENTED]
**File**: `app/ai/crowd/module.py`

## 1. Algorithm Overview
The Crowd Analysis module does not run its own heavy neural network. Instead, it reads the YOLO bounding boxes from the shared context.

### Density Calculation
```python
density_percentage = (Total Area of all Person Bounding Boxes) / (Total Frame Area) * 100
```
This provides a mathematically robust density metric regardless of camera perspective.

## 2. Outputs
- **Heatmap Generation**: Generates a 2D Gaussian blur over bounding box centroids, resulting in a color-mapped visual heatmap (`crowd_heatmap.png`) highlighting bottlenecks.
- **Alert Triggering**: If `density_percentage` exceeds the configurable `high_risk_threshold`, an alert is pushed to the `AlertEngine`.
