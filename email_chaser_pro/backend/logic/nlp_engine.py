from __future__ import annotations

import json
from typing import Dict

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline


MODEL_NAME = "google/flan-t5-small"


class AIEngineWarmingError(RuntimeError):
    pass


class NudgeGenerator:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self._generator = None

    def _load(self):
        if self._generator is None:
            try:
                tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
                self._generator = pipeline(
                    task="text2text-generation",
                    model=model,
                    tokenizer=tokenizer,
                )
            except Exception as exc:
                raise AIEngineWarmingError("AI_ENGINE_WARMING") from exc
        return self._generator

    def _build_input(self, original_email: str, category: str, priority: str) -> str:
        return (
            f"Context: User sent a {category} email with {priority} priority.\n"
            "Goal: Generate 3 distinct follow-up variants:\n"
            "- [CASUAL]: Short, friendly, no-pressure 'checking in' tone.\n"
            "- [PROFESSIONAL]: Formal, structured, and respectful of the recipient's time.\n"
            "- [VALUE-ADD]: Propose a new idea, share a relevant link, or offer help.\n"
            f"Original Email: {original_email}\n\n"
            "Return ONLY valid JSON with keys CASUAL, PROFESSIONAL, VALUE-ADD."
        )

    def _fallback_message(self, tone: str, original_email: str) -> str:
        preview = original_email.strip().replace("\n", " ")[:120]
        if tone == "Casual":
            return (
                "Hi there, just circling back on my previous note. "
                "No rush at all, but I wanted to check if you had a chance to review it."
            )
        if tone == "Value-Add":
            return (
                "Following up with a quick update that may help your decision. "
                "I also have a useful reference link to share if that would be valuable."
            )
        return (
            "I am following up regarding my previous email"
            f" ({preview}...). Please let me know your feedback when convenient."
        )

    def _fallback_variants(self, original_email: str) -> Dict[str, str]:
        return {
            "Casual": self._fallback_message("Casual", original_email),
            "Professional": self._fallback_message("Professional", original_email),
            "Value-Add": self._fallback_message("Value-Add", original_email),
        }

    def _extract_json(self, generated_text: str) -> Dict[str, str]:
        text = generated_text.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object in model output")
        payload = json.loads(text[start : end + 1])
        return {
            "Casual": str(payload.get("CASUAL", "")).strip(),
            "Professional": str(payload.get("PROFESSIONAL", "")).strip(),
            "Value-Add": str(payload.get("VALUE-ADD", "")).strip(),
        }

    def generate_variations(self, original_email: str, category: str, priority: str) -> Dict[str, str]:
        generator = self._load()
        try:
            model_output = generator(
                self._build_input(original_email, category, priority),
                max_new_tokens=260,
                do_sample=True,
                temperature=0.8,
                top_p=0.92,
                num_return_sequences=1,
            )
            parsed = self._extract_json(model_output[0]["generated_text"])
            fallback = self._fallback_variants(original_email)
            return {
                "Casual": parsed["Casual"] or fallback["Casual"],
                "Professional": parsed["Professional"] or fallback["Professional"],
                "Value-Add": parsed["Value-Add"] or fallback["Value-Add"],
            }
        except AIEngineWarmingError:
            raise
        except Exception:
            return self._fallback_variants(original_email)
