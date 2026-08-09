# The Enterprise Knowledge Base & LLM Master

A core feature of RailVision AI is its ability to not just draw boxes on a screen, but to *understand* the scene and answer user questions in natural language.

## 1. The Knowledge Base Generator
Instead of feeding raw bounding box arrays to an LLM (which would instantly crash its context window), the backend translates detections into a structured, semantic database called the **Enterprise Knowledge Base**.

After a video is processed, the `KnowledgeBaseBuilder` serializes the module outputs into JSON databases:
- `summary.json`: High-level aggregated statistics (total people seen, average crowd density).
- `timeline.json`: A chronological ledger of all generated alerts and incidents (e.g., "12:04:02 - Fight detected in Zone A").
- `objects.json`: Compressed track histories for specific people.
- `events.json`: Semantic graph of scene changes.

---

## 2. The Context Builder
When a user asks a question (e.g., "Were there any fights in the video?"):
1. The question is analyzed.
2. The `ContextBuilder` dynamically loads *only* the relevant JSON slices from the Knowledge Base (in this case, `timeline.json` and `events.json`).
3. It constructs an optimized prompt string combining the user's question and the specific JSON context.

This selective context loading completely prevents context-window overflows and reduces token generation costs/time.

---

## 3. Qwen 3 (The AI Master)
The system integrates **Qwen 3** via the `llm_service`. 
- Upon API startup, the LLM is loaded into VRAM.
- It receives the optimized prompts from the Context Builder and generates high-quality, token-efficient executive intelligence reports.
- Because it runs locally, sensitive surveillance intelligence never leaves the internal network.
