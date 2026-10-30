import requests
import json
import os
import re
from urllib.parse import urlparse
from abc import ABC, abstractmethod

# Reasoning models return their chain of thought alongside the answer: inline in
# <think> tags, or in a field of its own beside the content. Neither is part of the
# report, and none of it is JSON, so it has to come off before the formatter or the
# assessors see it.
_THINK_BLOCK = re.compile(r"<(think|thinking|reasoning)\b[^>]*>.*?</\1\s*>", re.S | re.I)
_UNCLOSED_THINK = re.compile(r"<(think|thinking|reasoning)\b[^>]*>.*\Z", re.S | re.I)


def strip_reasoning(text: str) -> str:
    """
    Removes a reasoning model's thinking from a completion.

    Handles the truncated case too: a response cut off mid-thought opens the block and
    never closes it, and everything after that tag is thinking, so it is dropped
    rather than handed to a JSON parser.
    """

    if not text:
        return ""

    cleaned = _THINK_BLOCK.sub("", text)
    cleaned = _UNCLOSED_THINK.sub("", cleaned)
    return cleaned.strip()

# Ollama counts the prompt and the generated answer against the same window, so a
# prompt that fills num_ctx leaves nothing to answer with, and llama.cpp then drops
# the oldest tokens -- which is the system prompt, i.e. the instructions. Nothing
# reported that, so a large prompt looked like a model that had stopped following
# orders: missing law vertices, thin diagrams, empty reports.
DEFAULT_NUM_CTX = 16384

# Reserved for the answer. A reasoning model spends its thinking from the same
# window, so this is a floor, not a generous allowance.
OUTPUT_RESERVE_TOKENS = 3072


def resolve_num_ctx() -> int:
    """
    Returns the Ollama context window, overridable with CORAS_LLM_NUM_CTX.

    Raising it costs VRAM: the KV cache grows linearly, and a window the GPU cannot
    hold spills to system memory, which is slow rather than broken.
    """

    return int(
        os.environ.get("CORAS_LLM_NUM_CTX", "").strip() or DEFAULT_NUM_CTX
    )


def estimate_tokens(text: str) -> int:
    """
    Approximates a token count at four characters per token.

    That is the same ratio the prompt budgets in assessor.py are built on. It is a
    rough figure, so it is used only to decide whether to warn.
    """

    return (len(text) + 3) // 4


def prompt_token_estimate(messages: list, system: str = None) -> int:
    chars = len(system or "")
    for message in messages or []:
        chars += len(message.get("content") or "")
    return (chars + 3) // 4


def warn_if_prompt_crowds_context(prompt_tokens: int, num_ctx: int, label: str):
    """
    Reports a prompt that leaves too little of the context window for an answer.
    """

    if prompt_tokens + OUTPUT_RESERVE_TOKENS <= num_ctx:
        return

    print(
        f"[LLM] WARNING: the {label} prompt is about {prompt_tokens} tokens and the "
        f"context window is {num_ctx}, leaving under {OUTPUT_RESERVE_TOKENS} for the "
        f"answer. Ollama drops the oldest tokens to fit, which silently removes the "
        f"instructions. Raise the window with CORAS_LLM_NUM_CTX (costs VRAM) or "
        f"select fewer laws."
    )


# A provider that refuses the requested completion ceiling says what it will accept
# ("must be less than or equal to 16384"). Reading that number back is better than
# guessing per model, because the cap is per model and changes without notice.
_LIMIT_HINT = re.compile(
    r"(?:less than or equal to|at most|maximum(?:\s+of)?|cannot exceed|must be\s*<=?)"
    r"[^0-9]{0,24}(\d{3,7})",
    re.I,
)


def cap_from_limit_error(body: str, requested: int):
    """
    Returns the ceiling a provider named when rejecting ours, or None.

    Only a number below what was asked for counts: anything else is a different
    complaint that happens to carry a digit.
    """

    if not body or not requested:
        return None

    lowered = body.lower()
    if "max_tokens" not in lowered and "max_completion_tokens" not in lowered:
        return None

    found = [int(m.group(1)) for m in _LIMIT_HINT.finditer(body)]
    below = [value for value in found if 0 < value < requested]
    return min(below) if below else None


class LLMProvider(ABC):
    """Universal interface for all LLM providers."""
    
    @abstractmethod
    def chat(self, messages: list, system: str = None, json_mode: bool = False) -> str:
        pass

class OpenAICompatibleAdapter(LLMProvider):
    """
    Universal adapter for OpenAI, Groq, Ollama (via /v1), LMStudio, etc.
    """

    # Providers apply their own completion limit when none is given, and on
    # reasoning models the reasoning tokens come out of this same budget before any
    # answer is written, which truncates a CORAS graph after a few characters.
    #
    # Groq's ceiling is per model -- 65,536 on the gpt-oss models, 32,768 on Llama
    # 3.3 70B, 16,384 on some preview models -- so there is no single number that is
    # both generous and always valid. Ask for a large one and let a model that allows
    # less say so: chat() reads the cap out of the rejection and retries.
    # Override with CORAS_LLM_MAX_TOKENS.
    DEFAULT_MAX_TOKENS = 8192
    PROVIDER_MAX_TOKENS = {"groq": 32768}

    @staticmethod
    def provider_from_url(base_url: str) -> str:
        """
        Names the provider behind a base URL, so a custom endpoint pointed at Groq
        gets the same budget as the built-in choice.
        """

        host = (urlparse(base_url).hostname or "").lower()
        if host == "groq.com" or host.endswith(".groq.com"):
            return "groq"
        if host == "openai.com" or host.endswith(".openai.com"):
            return "openai"
        return "custom"

    def __init__(self, api_key: str, base_url: str, model: str, provider: str = None):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.provider = provider or self.provider_from_url(self.base_url)
        self.max_tokens = int(
            os.environ.get("CORAS_LLM_MAX_TOKENS", "").strip()
            or self.PROVIDER_MAX_TOKENS.get(self.provider, self.DEFAULT_MAX_TOKENS)
        )

    def _relax_token_limit(self, payload: dict, body: str) -> bool:
        """
        Adjusts the completion-limit field after a 400 and reports whether to retry.

        Lowers our ceiling to the one the provider named, or renames the field for an
        API that no longer accepts max_tokens.
        """

        key = "max_completion_tokens" if "max_completion_tokens" in payload else "max_tokens"

        capped = cap_from_limit_error(body, payload.get(key))
        if capped:
            print(f"[LLM] {self.model} allows at most {capped} completion tokens; "
                  f"retrying with that.")
            payload[key] = capped
            return True

        if key == "max_tokens" and (
            "max_completion_tokens" in body or "max_tokens" in body
        ):
            payload["max_completion_tokens"] = payload.pop("max_tokens")
            print("[LLM] Retrying with max_completion_tokens.")
            return True

        return False

    def chat(self, messages: list, system: str = None, json_mode: bool = False) -> str:
        headers = {"Content-Type": "application/json"}
        
        if self.api_key and self.api_key != "not-needed":
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        payload_messages = []
        if system:
            payload_messages.append({"role": "system", "content": system})
        payload_messages.extend(messages)
        
        payload = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": 0.0,
            "max_tokens": self.max_tokens
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        prompt_tokens = prompt_token_estimate(payload_messages)
        if prompt_tokens > 30000:
            print(f"[LLM] Prompt is about {prompt_tokens} tokens; check it against "
                  f"{self.model}'s context limit.")
            
        try:
            response = requests.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)

            # We deliberately ask for a large completion budget, so settle the two
            # ways a provider can refuse it: a model whose ceiling is lower than
            # ours, and a newer API that renamed the field. Each is fixed once, so
            # the loop cannot spin.
            for _ in range(2):
                if response.status_code != 400:
                    break
                if not self._relax_token_limit(payload, response.text):
                    break
                response = requests.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=payload
                )

            # Some providers enforce JSON mode server-side and reject the whole request
            # when the model's output does not validate, returning nothing usable. The
            # caller extracts JSON from free text anyway, so retry once without the
            # constraint rather than losing the entire analysis.
            if response.status_code == 400 and json_mode:
                try:
                    code = response.json().get("error", {}).get("code", "")
                except Exception:
                    code = ""
                if code == "json_validate_failed":
                    print(
                        "[LLM] Provider rejected JSON mode; retrying as plain text."
                    )
                    payload.pop("response_format", None)
                    response = requests.post(
                        f"{self.base_url}/chat/completions", headers=headers, json=payload
                    )

            response.raise_for_status()

            body = response.json()
            choice = body["choices"][0]
            message = choice.get("message", {}) or {}
            content = strip_reasoning(message.get("content") or "")

            # Groq and others return a reasoning model's thinking in its own field and
            # leave content empty when the answer never arrived. For a prose report the
            # reasoning is worth more than nothing; for JSON it would only produce a
            # confusing parse failure, so leave that to fail on its own terms.
            if not content and not json_mode:
                thoughts = strip_reasoning(
                    message.get("reasoning") or message.get("reasoning_content") or ""
                )
                if thoughts:
                    print(
                        "[LLM] WARNING: the model returned reasoning but no answer; "
                        "using the reasoning text."
                    )
                    content = thoughts

            # "length" means the model was cut off mid-answer, which is the usual reason
            # a long DAG comes back with its edges missing. On a reasoning model the
            # thinking is what consumed the budget.
            if choice.get("finish_reason") == "length":
                print(
                    f"[LLM] WARNING: the response hit the {self.max_tokens} token limit "
                    f"and was truncated. Raise it with CORAS_LLM_MAX_TOKENS."
                )
            return content

        except requests.exceptions.HTTPError as e:
            error_details = response.text
            print(f"[LLM Error] Status: {response.status_code} - Details: {error_details}")
            
            clean_message = ""
            try:
                err_json = response.json()
                if "error" in err_json and "message" in err_json["error"]:
                    clean_message = err_json["error"]["message"]
            except Exception:
                clean_message = error_details

            if response.status_code == 404:
                user_msg = f"Model not found or not supported by this supplier. (Detail : {clean_message})"
            elif response.status_code == 401:
                user_msg = "Invalid or missing API key. Please check your LLM settings."
            elif response.status_code == 429:
                user_msg = "Request limit reached (Rate Limit). Please wait a moment."
            elif response.status_code == 400:
                user_msg = f"Invalid request (often a problem with the format or tokens). (Detail : {clean_message})"
            else:
                user_msg = f"Communication error with the AI (Code {response.status_code})."

            raise Exception(user_msg)

class OllamaNativeAdapter(LLMProvider):
    """
    An exclusive native adapter for Ollama to ensure that
    the extended context (num_ctx) is taken into account via the /api/chat endpoint.
    """
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url.rstrip("/").replace("/v1", "")
        self.model = model
        self.num_ctx = resolve_num_ctx()

    def chat(self, messages: list, system: str = None, json_mode: bool = False) -> str:
        payload_messages = []
        if system:
            payload_messages.append({"role": "system", "content": system})
        payload_messages.extend(messages)
        
        payload = {
            "model": self.model,
            "messages": payload_messages,
            "stream": False,
            "options": {
                "num_ctx": self.num_ctx,
                "temperature": 0.0
            }
        }
        
        if json_mode:
            payload["format"] = "json"

        warn_if_prompt_crowds_context(
            prompt_token_estimate(payload_messages), self.num_ctx, "Ollama"
        )

        try:
            response = requests.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()

            message = response.json().get("message", {}) or {}
            content = strip_reasoning(message.get("content") or "")
            # Ollama puts a thinking model's reasoning in its own field; fall back to it
            # rather than returning an empty report.
            if not content and not json_mode:
                content = strip_reasoning(message.get("thinking") or "")
            return content
            
        except requests.exceptions.HTTPError as e:
            error_details = response.text
            print(f"[Ollama Native Error] Status: {response.status_code} - Details: {error_details}")
            raise Exception(f"Communication error with native Ollama : {error_details}")