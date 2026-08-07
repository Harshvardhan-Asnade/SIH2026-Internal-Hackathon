"""
RailVision AI — LLM Intelligence Service

Integrates Qwen / Hugging Face Transformers as the "RailVision AI Master".
Ingests structured CV output and generates a comprehensive intelligence report.
"""

import json
import logging
from pathlib import Path
import asyncio

import torch

# Try importing transformers; if missing, we gracefully degrade
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Base Model ID - Use a smaller 0.5B model for the hackathon demo so it starts instantly without large downloads.
# (You can change this back to Qwen2.5-7B-Instruct for production later)
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"

class LLMService:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.system_prompt = self._load_system_prompt()
        self.is_ready = False

    def _load_system_prompt(self) -> str:
        prompt_path = Path(__file__).parent.parent / "ai" / "system_prompt.txt"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        logger.warning(f"System prompt not found at {prompt_path}, falling back to default.")
        return "You are RailVision AI Master. Analyze the JSON and provide an operational intelligence report."

    def initialize(self):
        """Loads the LLM into memory (blocking operation, run during startup)."""
        if not TRANSFORMERS_AVAILABLE:
            logger.error("transformers library is not installed. LLM Service disabled.")
            return

        logger.info(f"Loading LLM {MODEL_ID} ... This may take a while and require ~16GB RAM.")
        try:
            # We attempt to use bfloat16 or float16 to save memory
            # If on an Apple Silicon Mac, MPS is preferred but float16 is standard.
            device = "mps" if torch.backends.mps.is_available() else "cpu"
            dtype = torch.float16 if device == "mps" else torch.float32
            
            # Explicitly load on CPU first, then move to MPS to avoid AutoAccelerate hangs
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
            self.model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                torch_dtype=dtype,
                low_cpu_mem_usage=True
            ).to(device)
            
            self.is_ready = True
            logger.info("LLM initialized successfully!")
        except Exception as e:
            logger.error(f"Failed to load LLM: {e}")
            self.is_ready = False

    def _generate_sync(self, cv_json: dict, user_query: str = None) -> str:
        """Synchronous generation using HF Transformers."""
        if not self.is_ready or not self.model or not self.tokenizer:
            return "LLM Engine is not initialized or ran out of memory."

        # Format input
        if user_query:
            prompt_content = f"CONTEXT (CV DATA):\n{json.dumps(cv_json, indent=2)}\n\nUSER QUERY:\n{user_query}"
        else:
            prompt_content = f"Generate an intelligence report based on this CV data:\n{json.dumps(cv_json, indent=2)}"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt_content}
        ]

        try:
            text = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True
            )
            model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

            with torch.no_grad():
                generated_ids = self.model.generate(
                    **model_inputs,
                    max_new_tokens=1024,
                    temperature=0.3,
                    do_sample=True,
                    top_p=0.9
                )
            
            # Trim the input prompt tokens from the output
            generated_ids = [
                output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
            ]
            response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            return response.strip()
        except Exception as e:
            logger.error(f"Error during LLM generation: {e}")
            return f"Error generating intelligence report: {str(e)}"

    async def generate_report(self, cv_json: dict) -> str:
        """Async wrapper for generating the final video processing report."""
        return await asyncio.to_thread(self._generate_sync, cv_json)

    async def query_assistant(self, query: str, context_json: dict = None) -> str:
        """Async wrapper for the conversational Natural Language Engine."""
        context = context_json or {"info": "No specific video context provided."}
        return await asyncio.to_thread(self._generate_sync, context, query)

# Singleton instance
llm_service = LLMService()
