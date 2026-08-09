# Alert Generation & De-duplication Algorithm

**Status**: [IMPLEMENTED]

## 1. The Alert Storm Problem
In video analytics, running an AI detector on every frame at 30 FPS can produce 30 alerts per second for the *same* incident (e.g., a person loitering). Sending hundreds of duplicate alerts collapses API response time and creates notification fatigue for operators.

## 2. Sliding Window De-duplication
RailVision applies a **Temporal Sliding Window Filter**:

```python
class AlertDeduplicator:
    def __init__(self, cooldown_seconds: float = 10.0):
        self.cooldown = cooldown_seconds
        self.last_alerts = {} # key: (alert_type, zone_id) -> timestamp

    def should_dispatch(self, alert_type: str, zone_id: str, current_time: float) -> bool:
        key = (alert_type, zone_id)
        if key in self.last_alerts:
            if current_time - self.last_alerts[key] < self.cooldown:
                return False # Suppress duplicate
        self.last_alerts[key] = current_time
        return True
```

## 3. Escalation Rules
- If an alert of level `MODERATE` persists for $> 30$ seconds without resolution, it automatically escalates to `HIGH`.
- Multiple simultaneous `HIGH` alerts trigger a `CRITICAL` station-wide panic flag.
