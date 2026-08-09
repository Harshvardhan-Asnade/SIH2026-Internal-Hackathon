# Crowd Density & Heatmapping Algorithm

**Status**: [IMPLEMENTED]
**Implementation**: `app/ai/crowd/module.py`

## 1. People Counting & Occupancy
Rather than attempting complex head-counting models that struggle under occlusion, RailVision estimates crowd presence using YOLO bounding boxes combined with geometric area normalization.

### Area Fill Ratio
$$\text{Density Ratio} = \frac{\sum_{i=1}^{N} \text{Area}(B_i)}{\text{Area}(\text{Frame})}$$

Where $B_i$ represents the bounding box of person $i$, and $N$ is the total person count detected.

---

## 2. Heatmap Generation Pipeline
To create the visual `crowd_heatmap.png` overlay:

1. **Centroid Extraction**: Compute center point $(x_c, y_c) = \left(x_1 + \frac{w}{2}, y_1 + \frac{h}{2}\right)$ for each detected person.
2. **Accumulation Matrix**: Add point mass to a 2D zero-initialized float numpy matrix matching the video resolution $H \times W$.
3. **Gaussian Blur Smoothing**: Apply a 2D Gaussian Kernel filter:
   $$G(x, y) = \frac{1}{2\pi\sigma^2} e^{-\frac{x^2 + y^2}{2\sigma^2}}$$
   with $\sigma = 31$ to transform discrete centroids into continuous density blobs.
4. **Color Mapping**: Apply OpenCV `COLORMAP_JET` to map density values $[0, 255]$ into a spectral gradient (Blue = Sparse, Yellow = Moderate, Red = Dense).
5. **Alpha Blending**: Blend heatmap onto original frame using $\alpha = 0.4$:
   $$\text{Output} = \alpha \cdot \text{Heatmap} + (1 - \alpha) \cdot \text{Original Frame}$$
