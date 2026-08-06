import json
import os
import re
import glob
import requests
from bs4 import BeautifulSoup

NAVIGATOR_DIR = "./"
RAG_DOCS_DIR = f"{NAVIGATOR_DIR}rag-docs/"
LAWS_DOCS_DIR = f"{RAG_DOCS_DIR}laws_files/"

GLOBAL_CONTEXT_FILE = os.path.join(RAG_DOCS_DIR, "laws_contexts.json")

def generate_tooltip_with_ollama(law_name: str, context_text: str) -> str:
    if not context_text.strip():
        return "No description available for this law."

    truncated_context = context_text[:4000] 

    prompt = (
        f"You are a legal expert. Summarize the main objective of the following law ({law_name}) "
        f"in a SINGLE short, clear, and concise sentence (maximum 150 characters). "
        f"This sentence will be used as a tooltip in a web interface. "
        f"Do not write any introduction, just provide the summary directly.\n\n"
        f"Law context:\n{truncated_context}"
    )

    try:
        response = requests.post("http://localhost:11434/api/generate", json={
            "model": "llama3.1:8b",
            "prompt": prompt,
            "stream": False
        })
        
        if response.status_code == 200:
            return response.json().get("response", "").strip()
        else:
            print(f"Ollama error ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"Connexion error to Ollama : {e}")
        
    return "Description not available."

def process_law_file(html_filepath: str, global_contexts: dict) -> None:
    with open(html_filepath, "r", encoding="utf-8") as file:
        soup = BeautifulSoup(file, "html.parser")

    law_name = os.path.splitext(os.path.basename(html_filepath))[0]
    json_filepath = os.path.join(RAG_DOCS_DIR, f"{law_name}-structured.json")

    articles = []
    general_context_parts = []

    target_divs = soup.find_all("div", id=re.compile(r"^(art|rct|cit)_\d+[a-z]*$"))

    for div in target_divs:
        div_id = div.get("id")
        content = div.get_text(separator="\n", strip=True)
        
        if not content:
            continue

        if div_id.startswith("art_"):
            title_tag = div.find("p", class_="oj-ti-art")
            article_id = title_tag.get_text(strip=True) if title_tag else div_id.replace("art_", "Article ").capitalize()
            
            articles.append({
                "article_id": article_id,
                "content": content
            })
            
        elif div_id.startswith("rct_") or div_id.startswith("cit_"):
            general_context_parts.append(content)

    with open(json_filepath, "w", encoding="utf-8") as json_file:
        json.dump(articles, json_file, indent=4, ensure_ascii=False)
        
    full_context = "\n\n".join(general_context_parts)
    
    law_data = global_contexts.get(law_name, {})
    
    if isinstance(law_data, str):
        law_data = {"context": law_data, "tooltip": ""}

    law_data["context"] = full_context
    
    if not law_data.get("tooltip"):
        law_data["tooltip"] = generate_tooltip_with_ollama(law_name, full_context)
        
    global_contexts[law_name] = law_data
    
    print(f"Success : '{law_name}' finish. {len(articles)} articles saved for the RAG.")

if __name__ == "__main__":
    os.makedirs(RAG_DOCS_DIR, exist_ok=True)
    html_files = glob.glob(os.path.join(LAWS_DOCS_DIR, "*.html"))
    
    global_contexts = {}
    if os.path.exists(GLOBAL_CONTEXT_FILE):
        with open(GLOBAL_CONTEXT_FILE, "r", encoding="utf-8") as f:
            try: 
                global_contexts = json.load(f)
            except json.JSONDecodeError: 
                global_contexts = {}

    for html_path in html_files:
        process_law_file(html_path, global_contexts)
        
    with open(GLOBAL_CONTEXT_FILE, "w", encoding="utf-8") as f:
        json.dump(global_contexts, f, indent=4, ensure_ascii=False)