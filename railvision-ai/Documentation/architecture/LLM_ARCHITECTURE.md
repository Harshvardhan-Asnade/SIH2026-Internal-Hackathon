# LLM Architecture

## 1. Local Execution
We utilize `Qwen/Qwen2.5-0.5B-Instruct` via the Hugging Face `transformers` library.
- **Why Local?**: Sending surveillance data to OpenAI or Anthropic is a massive privacy violation and latency bottleneck.
- **Why Qwen 0.5B?**: It is small enough to run on CPUs or edge devices with <4GB RAM, while maintaining excellent reasoning capabilities.

## 2. The Context Window Problem
LLMs crash if you feed them too much text (e.g., sending an array of 30,000 bounding boxes). 
We solve this using a dynamic **Context Builder** (`app/services/context_builder.py`).

## 3. Query Routing
When a user asks: "Were there any fights?", the `QuestionRouter` detects the regex keyword `fight` and routes the category to `crime`.
The `ContextBuilder` then selectively loads `crime.json` and `timeline.json` (ignoring `worker.json` to save tokens) and constructs a highly optimized prompt string.
