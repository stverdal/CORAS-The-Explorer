from flask import Flask, request
from flask_cors import CORS
import json
import os
import requests

from summarizer import *
from navigator import *
from llm_adapters import LLMProvider, OpenAICompatibleAdapter, OllamaNativeAdapter

app = Flask(__name__)
CORS(app)

capec_rag = CapecRAG(
    embedding_model="nomic-embed-text:latest", 
    directory="./vector-stores/capec/", 
    complete_capec=("./rag-docs/capec-detailed.json", DocumentExtension.JSON)
)
cve_rag = NVDRAG(
    embedding_model="nomic-embed-text:latest", 
    directory="./vector-stores/nvd/"
)
compliance_rag = ComplianceRAG(
    embedding_model="nomic-embed-text:latest", 
    directory="./vector-stores/compliance/"
)

# Server-side defaults for the inference target. Each can be overridden per request
# from the UI; these decide what the UI starts on and what is used when a field is
# left blank. Set them in the environment, e.g.
#   make navigator CORAS_LLM_PROVIDER=groq CORAS_LLM_MODEL=llama-3.3-70b-versatile
# `or` rather than a get() default, so an exported-but-empty variable (which is what
# `make navigator` passes when the user sets nothing) still falls back correctly.
DEFAULT_LLM_PROVIDER = os.environ.get("CORAS_LLM_PROVIDER", "").strip() or "ollama"
DEFAULT_LLM_MODEL = os.environ.get("CORAS_LLM_MODEL", "").strip() or "qwen2.5:72b"
DEFAULT_LLM_BASE_URL = os.environ.get("CORAS_LLM_BASE_URL", "").strip()
# Never sent to the browser: used only when the request carries no key of its own.
DEFAULT_LLM_API_KEY = os.environ.get("CORAS_LLM_API_KEY", "").strip()

# Where the API binds. 0.0.0.0 exposes it beyond this machine, so the default stays
# local and an SSH tunnel is the usual way in.
EMBEDDING_MODEL = "nomic-embed-text"

API_HOST = os.environ.get("CORAS_API_HOST", "").strip() or "127.0.0.1"
API_PORT = int(os.environ.get("CORAS_API_PORT", "").strip() or "5242")

# Which NVD years to embed into the CVE vector store. Each year is roughly 30-60k CVEs
# and embedding is the slow part of the first start, so a smoke test wants one year:
#   make navigator CORAS_NVD_YEARS=2026
# Changing this list rebuilds the store automatically on the next start.
NVD_YEARS = [
    y.strip() for y in os.environ.get("CORAS_NVD_YEARS", "").split(",") if y.strip()
] or ["2022", "2023", "2024", "2025", "2026"]


def _ollama_url_from_env() -> str:
    """
    Builds the native Ollama URL from OLLAMA_HOST, which the Makefile sets from
    OLLAMA_HOSTNAME/OLLAMA_PORT. This is what makes `make navigator OLLAMA_PORT=11435`
    reach a tunnelled remote Ollama instead of the default local one.
    """
    host = os.environ.get("OLLAMA_HOST", "").strip()
    if not host:
        return "http://localhost:11434"
    if not host.startswith(("http://", "https://")):
        host = f"http://{host}"
    return host.rstrip("/")


@app.route('/coras_navigator_api/config', methods=["GET"])
def get_config():
    """
    Reports the inference target the server was started with, so the UI can
    pre-select it. The API key is deliberately excluded from this response.
    """
    return {
        "llm_provider": DEFAULT_LLM_PROVIDER,
        "llm_model": DEFAULT_LLM_MODEL,
        "llm_base_url": DEFAULT_LLM_BASE_URL,
        "server_api_key_configured": bool(DEFAULT_LLM_API_KEY),
    }


# Endpoints that serve an OpenAI-style /models listing.
PROVIDER_API_ROOTS = {
    "openai": "https://api.openai.com/v1",
    "groq": "https://api.groq.com/openai/v1",
}

# Model families that cannot answer a chat completion, so they must not reach the
# model dropdown: speech-to-text, text-to-speech, embeddings, moderation, image.
NON_CHAT_MODEL_HINTS = (
    "whisper", "tts", "embed", "guard", "moderation", "dall-e", "playai", "rerank", "sora",
)


def _is_chat_model(model_id: str) -> bool:
    lowered = model_id.lower()
    return not any(hint in lowered for hint in NON_CHAT_MODEL_HINTS)


@app.route('/coras_navigator_api/models', methods=["POST"])
def list_models():
    """
    Lists the models the configured provider actually offers, so the UI dropdown
    reflects the live catalogue instead of a hardcoded list that silently rots.

    The request may carry its own key; otherwise the server's key is used. The key is
    read from the body rather than the query string so it stays out of access logs.
    """
    try:
        options = request.get_json(silent=True) or {}
        provider = (options.get("llm_provider") or DEFAULT_LLM_PROVIDER).strip()
        api_key = (options.get("llm_api_key") or DEFAULT_LLM_API_KEY).strip()
        base_url = (options.get("llm_base_url") or DEFAULT_LLM_BASE_URL).strip()

        if provider == "ollama":
            url = base_url or _ollama_url_from_env()
            response = requests.get(f"{url.rstrip('/')}/api/tags", timeout=15)
            response.raise_for_status()
            models = [m["name"] for m in response.json().get("models", [])]
        else:
            url = PROVIDER_API_ROOTS.get(provider) or base_url
            if not url:
                return {"models": [], "error": "Set a base URL for this provider first."}
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
            response = requests.get(f"{url.rstrip('/')}/models", headers=headers, timeout=15)
            response.raise_for_status()
            models = [m["id"] for m in response.json().get("data", [])]

        return {"models": sorted(m for m in models if _is_chat_model(m))}

    except requests.exceptions.HTTPError as error:
        status = error.response.status_code
        if status == 401:
            message = "Invalid or missing API key."
        elif status == 403:
            message = "This key is not allowed to list models."
        else:
            message = f"Could not reach the provider (code {status})."
        print(f"[Error list_models]: {status} - {error.response.text[:200]}")
        return {"models": [], "error": message}
    except Exception as error:
        print(f"[Error list_models]: {error}")
        return {"models": [], "error": "Could not reach the provider."}


def get_llm_from_options(options: dict) -> LLMProvider:
    """
    Constructs the HTTP adapter based on the options sent by the frontend.
    API keys are stored in memory only for the duration of this request.

    Any field the frontend leaves blank falls back to the corresponding
    CORAS_LLM_* environment variable.
    """
    provider = (options.get("llm_provider") or DEFAULT_LLM_PROVIDER).strip()
    model_name = (options.get("llm_model") or DEFAULT_LLM_MODEL).strip()
    api_key = (options.get("llm_api_key") or DEFAULT_LLM_API_KEY).strip()
    base_url = (options.get("llm_base_url") or DEFAULT_LLM_BASE_URL).strip()

    if provider == "openai":
        if not api_key:
            raise ValueError("API Key is required for OpenAI")
        return OpenAICompatibleAdapter(
            api_key=api_key, 
            base_url="https://api.openai.com/v1", 
            model=model_name
        )

    elif provider == "groq":
        if not api_key:
            raise ValueError("API Key is required for Groq")
        return OpenAICompatibleAdapter(
            api_key=api_key, 
            base_url="https://api.groq.com/openai/v1", 
            model=model_name
        )

    elif provider == "custom_openai_compatible":
        if not base_url:
            raise ValueError("Base URL is required for custom providers")
        return OpenAICompatibleAdapter(
            api_key=api_key or "not-needed", 
            base_url=base_url, 
            model=model_name
        )

    else:
        url = base_url if base_url else _ollama_url_from_env()
        return OllamaNativeAdapter(
            base_url=url, 
            model=model_name
        )

def build_navigator_for_request(options: dict) -> CorasNavigator:
    """
    Invokes all agents using the LLM configured for THIS specific request.
    """
    llm = get_llm_from_options(options)
    
    tech_assesor = TechnicalAssesor(llm)
    legal_assessor = LegalAssessor(llm)
    summarizer = SimpleSummarizer(llm)
    formatter = SimpleJSONFormatter(llm)
    
    return CorasNavigator(
        summarizer, capec_rag, cve_rag, compliance_rag, tech_assesor, legal_assessor, formatter
    )

@app.route('/coras_navigator_api/generate_summary', methods=["POST"])
def generate_summary():
    try:
        json_data = request.get_json()
        options = json_data.get('options', {})
        
        navigator = build_navigator_for_request(options)
        summary = navigator.summarize(json_data['context-description'])
        return {'summary': summary} 
    except Exception as e:
        print(f"[Error generate_summary]: {e}")
        return {'error': str(e)}, 500
    
    

@app.route('/coras_navigator_api/generate_scope_selection', methods=["POST"])
def generate_scope_selection():
    try:
        json_data = request.get_json()
        summary = json_data.get('summary', '')
        options = json_data.get('options', {})

        if not summary:
            return {'threats_source': [], 'assets': []}

        navigator = build_navigator_for_request(options)    
        scope_data = navigator.tech_assesor.extract_scope(summary, options=options)
        return scope_data
    except Exception as e:
        print(f"[Error generate_scope_selection]: {e}")
        return {'error': str(e)}, 500

@app.route('/coras_navigator_api/generate_risks', methods=["POST"])
def generate_risks():
    try:
        json_data = request.get_json()
        
        options = json_data.get('options', {})

        navigator = build_navigator_for_request(options)
        results = navigator.generate_full_analysis(
            text=json_data['summary'], 
            options=options, 
            tech_context=json_data.get('tech_context', ''),
            legal_context=json_data.get('legal_context', ''),
            existing_tech_report=json_data.get('existing_tech_report', ''),
            existing_legal_report=json_data.get('existing_legal_report', '')
        )
        return {
            'analysis': results["final_analysis_for_coras"],
            'technical_analysis': results["technical_report"],
            'compliance_analysis': results["legal_report"]
        }
    except Exception as e:
        print(f"[Error generate_risks]: {e}")
        return {'error': str(e)}, 500

@app.route('/coras_navigator_api/generate_coras_model', methods=["POST"])
def generate_coras_model():
    try:
        json_data = request.get_json()
        options = json_data.get('options', {})
        analysis_text = json_data.get('risk-analysis') or json_data.get('analysis')

        if not analysis_text:
            return {'coras_model': ""}
        print("Formatting...")
        navigator = build_navigator_for_request(options)
        format_output = navigator.format(text=analysis_text, options=options)
        model = navigator.extract_json(format_output)
        return {
            'coras_model': model
        }
    except Exception as e:
        print(f"[Error generate_coras_model]: {e}")
        return {'error': str(e)}, 500

def check_port_is_free(host: str, port: int):
    """
    Fails fast if something already listens on the API port.

    Flask only binds after the vector stores are loaded, so without this a second
    instance does all of that work before reporting the clash.
    """

    import socket

    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.settimeout(2)
    try:
        if probe.connect_ex(("127.0.0.1" if host == "0.0.0.0" else host, port)) == 0:
            raise SystemExit(
                f"\nPort {port} is already in use, most likely by another Navigator.\n"
                f"Stop it, or pick a different port:\n"
                f"  make navigator CORAS_API_PORT=<port>\n"
            )
    finally:
        probe.close()


def check_embedding_backend():
    """
    Fails fast if Ollama is unreachable or the embedding model is missing.

    Retrieval embeddings always run on Ollama, whatever CORAS_LLM_PROVIDER is set to,
    because no external chat provider serves embeddings and a vector store must be
    queried with the model that built it. Loading a saved store does not embed
    anything, so without this check an unreachable Ollama only surfaces much later,
    as a failure in the middle of an analysis.
    """

    url = _ollama_url_from_env()
    try:
        response = requests.get(f"{url}/api/tags", timeout=10)
        response.raise_for_status()
        models = [m.get("name", "") for m in response.json().get("models", [])]
    except Exception:
        raise SystemExit(
            f"\nOllama is not reachable at {url}.\n"
            f"Embeddings always run on Ollama, even when generation uses another "
            f"provider.\n"
            f"Start Ollama, or point the Navigator at it:\n"
            f"  make navigator OLLAMA_HOSTNAME=<host> OLLAMA_PORT=<port>\n"
        )

    if not any(m.startswith(EMBEDDING_MODEL) for m in models):
        raise SystemExit(
            f"\nOllama at {url} does not have the embedding model "
            f"'{EMBEDDING_MODEL}'.\nRun: make pull-models\n"
        )

    print(f"Embedding backend ready: {EMBEDDING_MODEL} at {url}")


def load_all_vector_stores():
    """
    Builds or loads every vector store the Navigator needs.

    Split out of __main__ so the stores can be built ahead of time by
    `make build-stores` without holding a web server open for hours.
    """

    check_embedding_backend()

    capec_rag.load_files([(
        "./rag-docs/capec-abstract.txt",
        DocumentExtension.TXT
    )])

    compliance_rag.load_files([
        ("./rag-docs/GDPR-structured.json", DocumentExtension.JSON),
        ("./rag-docs/AI_Act-structured.json", DocumentExtension.JSON),
        ("./rag-docs/NIS2-structured.json", DocumentExtension.JSON),
        ("./rag-docs/Cyber_Resilience_Act-structured.json", DocumentExtension.JSON),
        ("./rag-docs/Cybersecurity_Act-structured.json", DocumentExtension.JSON)
        ])

    print(f"Loading NVD years: {', '.join(NVD_YEARS)}")
    cve_rag.load_files([
        (f"./rag-docs/nvdcve-2.0-{year}.json", DocumentExtension.JSON)
        for year in NVD_YEARS
    ])
    print("All vector stores are ready.")


if __name__ == '__main__':
    check_port_is_free(API_HOST, API_PORT)
    load_all_vector_stores()
    print(f"Serving the Navigator API on http://{API_HOST}:{API_PORT}")
    app.run(debug=True, host=API_HOST, port=API_PORT, use_reloader=False)
    
