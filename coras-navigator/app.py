from flask import Flask, request
from flask_cors import CORS
import json

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

def get_llm_from_options(options: dict) -> LLMProvider:
    """
    Constructs the HTTP adapter based on the options sent by the frontend.
    API keys are stored in memory only for the duration of this request.
    """
    provider = options.get("llm_provider", "ollama")
    model_name = options.get("llm_model", "qwen2.5:72b").strip()
    api_key = options.get("llm_api_key", "").strip()
    base_url = options.get("llm_base_url", "").strip()

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
        url = base_url if base_url else "http://localhost:11434"
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
        print(results["final_analysis_for_coras"])
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
        print(model)
        return {
            'coras_model': model
        }
    except Exception as e:
        print(f"[Error generate_coras_model]: {e}")
        return {'error': str(e)}, 500

if __name__ == '__main__': 
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

    cve_rag.load_files([
        ("./rag-docs/nvdcve-2.0-2026.json", DocumentExtension.JSON),
        ("./rag-docs/nvdcve-2.0-2025.json", DocumentExtension.JSON),
        ("./rag-docs/nvdcve-2.0-2024.json", DocumentExtension.JSON),
        ("./rag-docs/nvdcve-2.0-2023.json", DocumentExtension.JSON),
        ("./rag-docs/nvdcve-2.0-2022.json", DocumentExtension.JSON)
    ])

    app.run(debug=True, port=5242)
    
