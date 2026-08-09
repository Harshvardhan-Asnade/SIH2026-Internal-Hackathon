# Risk Scoring Algorithm

**Status**: [IMPLEMENTED]

## 1. Mathematical Formulation
The overall risk score $R_{total} \in [0, 100]$ represents the composite threat level of a given video frame or time window. It is computed as a weighted sum of independent sub-scores:

$$R_{total} = w_c \cdot R_{crowd} + w_k \cdot R_{crime} + w_w \cdot R_{worker}$$

Where:
- $w_c = 0.40$ (Crowd weight)
- $w_k = 0.45$ (Crime weight)
- $w_w = 0.15$ (Worker compliance weight)

---

## 2. Component Sub-Scores

### A. Crowd Risk ($R_{crowd}$)
$R_{crowd}$ is derived non-linearly from occupant density ($ho$) relative to maximum capacity ($ho_{max}$):

$$R_{crowd} = \min\left(100, \left(\frac{\rho}{\rho_{max}}\right)^2 \times 100\right)$$

Quadratic scaling ensures that minor crowds generate low risk scores (e.g. 20%), but density spikes near capacity explode exponentially toward 100%.

### B. Crime Risk ($R_{crime}$)
$R_{crime}$ is calculated based on active incident severity levels:
- **Low (Loitering)**: +15 points per event
- **Medium (Intrusion/Unattended Baggage)**: +40 points per event
- **Critical (Violence/Panic/Stampede)**: +80 points per event

$$R_{crime} = \min(100, \sum \text{Event Weights})$$

### C. Worker Risk ($R_{worker}$)
$R_{worker}$ reflects safety non-compliance:

$$R_{worker} = 100 - \text{Safety Compliance Percentage}$$

If safety compliance is 100%, $R_{worker} = 0$. If non-compliance is high, risk increases.

---

## 3. Severity Categorization Matrix

| Composite Risk Score ($R_{total}$) | Severity Level | Action Required | UI Color Code |
|---|---|---|---|
| **0 – 29** | `LOW` / `NORMAL` | Passive monitoring | Green `#10B981` |
| **30 – 59** | `MODERATE` | Log event; highlight in dashboard | Yellow `#F59E0B` |
| **60 – 79** | `HIGH` | Notify local station operators | Orange `#F97316` |
| **80 – 100** | `CRITICAL` | Trigger audio alert; escalate to RPF | Red `#EF4444` |
