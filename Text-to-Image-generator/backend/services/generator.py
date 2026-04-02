import base64
import io
import os
import re
import threading
from typing import List

import torch
from diffusers import StableDiffusionPipeline
from transformers import pipeline


class GeneratorService:
    def __init__(self, logger):
        self.logger = logger
        self.enable_text = os.getenv("ENABLE_TEXT_GENERATION", "true").lower() == "true"
        self.enable_image = os.getenv("ENABLE_IMAGE_GENERATION", "true").lower() == "true"
        self.text_model_id = os.getenv("TEXT_MODEL_ID", "gpt2")
        self.image_model_id = os.getenv("IMAGE_MODEL_ID", "runwayml/stable-diffusion-v1-5")
        self.max_tokens = int(os.getenv("MAX_NEW_TOKENS", "400"))
        self._text_pipe = None
        self._image_pipe = None
        self._pipeline_init_lock = threading.Lock()
        self._image_lock = threading.Lock()

    def _get_text_pipeline(self):
        if self._text_pipe is None:
            self.logger.info("Loading text model: %s", self.text_model_id)
            self._text_pipe = pipeline("text-generation", model=self.text_model_id)
        return self._text_pipe

    def _get_image_pipeline(self):
        if self._image_pipe is None:
            with self._pipeline_init_lock:
                if self._image_pipe is None:
                    self.logger.info("Loading image model: %s", self.image_model_id)
                    self._image_pipe = StableDiffusionPipeline.from_pretrained(
                        self.image_model_id,
                        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    )
                    if torch.cuda.is_available():
                        self._image_pipe = self._image_pipe.to("cuda")
        return self._image_pipe

    def generate_article(self, prompt: str) -> str:
        if not self.enable_text:
            return self._fallback_article(prompt)

        text_pipe = self._get_text_pipeline()
        engineered_prompt = (
            "Write a structured, informative article with title, introduction, "
            "body sections, and conclusion about: "
            f"{prompt}\n\nArticle:\n"
        )
        result = text_pipe(
            engineered_prompt,
            max_new_tokens=self.max_tokens,
            do_sample=True,
            temperature=0.85,
            top_p=0.92,
            num_return_sequences=1,
        )
        generated = result[0]["generated_text"]
        return generated.strip()

    def generate_images(self, source_text: str, count: int = 1) -> List[str]:
        if not self.enable_image:
            return []

        image_pipe = self._get_image_pipeline()
        prompt = self._build_image_prompt(source_text)
        images: List[str] = []

        for index in range(count):
            try:
                with self._image_lock:
                    result = image_pipe(
                        prompt=f"{prompt}, variation {index + 1}",
                        num_inference_steps=25,
                        guidance_scale=7.5,
                    )
            except Exception:
                raise
            pil_image = result.images[0]
            output_buffer = io.BytesIO()
            pil_image.save(output_buffer, format="PNG")
            encoded = base64.b64encode(output_buffer.getvalue()).decode("utf-8")
            images.append(f"data:image/png;base64,{encoded}")

        return images

    def _build_image_prompt(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", text).strip()
        excerpt = cleaned[:240]
        return f"Editorial illustration, high quality, detailed, based on: {excerpt}"

    def _fallback_article(self, prompt: str) -> str:
        return (
            f"# {prompt}\n\n"
            "## Introduction\n"
            "This is a fallback article because text generation is currently disabled.\n\n"
            "## Key Points\n"
            "- Explain the background context.\n"
            "- Discuss major insights.\n"
            "- Provide practical takeaways.\n\n"
            "## Conclusion\n"
            "Enable model generation to produce fully AI-authored content."
        )
