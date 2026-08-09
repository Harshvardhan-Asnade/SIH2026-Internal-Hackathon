# Context Builder & Prompt Assembly

**Status**: [IMPLEMENTED]
**File**: `app/services/context_builder.py`

## 1. Purpose
The `ContextBuilder` prepares compact, high-signal prompts for the local Qwen LLM by extracting data from the Knowledge Base JSON files.

## 2. Prompt Construction Logic
To maintain prompt sizes between **1,000 and 3,000 tokens** (avoiding context window degradation):

1. **Base Context Insertion (Always Included)**:
   - Executive Summary (`summary.json`)
   - High-level Crowd Summary (`crowd.json`)
   - High-level Crime Summary (`crime.json`)
   - High-level Worker Compliance (`worker.json`)
   - Recent Top Alerts (`alerts.json`)
   - Recommendations (`recommendations.json`)

2. **Dynamic Extra Context (Category-Based)**:
   - If `QuestionRouter` detects a **crowd query**, it injects detailed zone matrices from `crowd.json`.
   - If it detects a **crime query**, it injects specific incident lists from `crime.json`.
   - If it detects a **time query**, it injects the chronological `timeline.json`.
   - If it detects an **object query**, it injects `objects.json`.

3. **System Prompt Wrapping**:
   Encapsulates context in structured demarcations:
   ```text
   --- INVESTIGATION DATA START ---
   [Base + Extra Context]
   --- INVESTIGATION DATA END ---
   USER QUESTION: {query}
   ```
