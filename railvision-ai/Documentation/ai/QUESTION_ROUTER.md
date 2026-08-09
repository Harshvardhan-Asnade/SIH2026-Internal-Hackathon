# Question Router Architecture

**Status**: [IMPLEMENTED]
**Location**: `app/services/context_builder.py` (`QuestionRouter` class)

## 1. Regex Routing Mechanism
The `QuestionRouter` analyzes natural language user queries using high-speed regular expression patterns to classify the user's intent:

```python
ROUTES = {
    "crowd": [r"\b(how many people|crowd|density|occupancy|congestion|packed|busy|peak|heatmap)\b"],
    "crime": [r"\b(crime|criminal|fight|stolen|theft|intrusion|suspicious|loiter|violence|attack)\b"],
    "worker": [r"\b(worker|staff|helmet|jacket|safety|ppe|compliance|employee)\b"],
    "frame": [r"\b(frame \d+|at \d+:\d+|timestamp|minute|second)\b"],
    "object": [r"\b(person \d+|track \d+|object \d+|track id|follow|trace)\b"],
    "recommend": [r"\b(recommend|suggestion|what should|advise|action|deploy)\b"]
}
```

## 2. Fallback Handling
If a query matches no patterns (e.g. "What color is the sky?"), the router defaults to `"summary"`, loading the standard base executive context without extra domain logs.
