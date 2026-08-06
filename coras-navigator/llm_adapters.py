import requests
import json
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """Universal interface for all LLM providers."""
    
    @abstractmethod
    def chat(self, messages: list, system: str = None, json_mode: bool = False) -> str:
        pass

class OpenAICompatibleAdapter(LLMProvider):
    """
    Universal adapter for OpenAI, Groq, Ollama (via /v1), LMStudio, etc.
    """
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

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
            "temperature": 0.0
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
            
        try:
            response = requests.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            
            return response.json()["choices"][0]["message"]["content"]
            
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
                "num_ctx": 16384,
                "temperature": 0.0
            }
        }
        
        if json_mode:
            payload["format"] = "json"
            
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()
            
            return response.json()["message"]["content"]
            
        except requests.exceptions.HTTPError as e:
            error_details = response.text
            print(f"[Ollama Native Error] Status: {response.status_code} - Details: {error_details}")
            raise Exception(f"Communication error with native Ollama : {error_details}")