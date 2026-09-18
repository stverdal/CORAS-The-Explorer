import requests
import zipfile
import os
import json

import os as _os
# Paths are anchored to this script's location so the make targets, a cron job and a
# manual run from any directory all resolve the same files.
NAVIGATOR_DIR = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))) + "/"
TEMP_DIR = f"{NAVIGATOR_DIR}.temp/"
RAG_DOCS_DIR = f"{NAVIGATOR_DIR}rag-docs/"
SOURCES_FILE = f"{NAVIGATOR_DIR}resource/rag-sources.json"

def create_temp_directory():
    if not os.path.exists(TEMP_DIR):
        os.mkdir(TEMP_DIR)
        print(f"Created directory '{TEMP_DIR}'")

def get_json_from_file(filepath: str):
    with open(filepath, 'r') as file:
        data = json.load(file)
    return data

def download(url: str, save_path: str, chunk_size=128):
    print(f"Downloading {save_path} from {url}...")
    r = requests.get(url, stream=True)
    with open(save_path, 'wb') as fd:
        for chunk in r.iter_content(chunk_size=chunk_size):
            fd.write(chunk)

def extract(filepath: str, extract_directory: str):
    print(f"Extracting  {filepath} to {extract_directory}...")
    with zipfile.ZipFile(filepath, "r") as zip_file:
        zip_file.extractall(extract_directory)

def delete(filepath: str):
    print(f"Deleting    {filepath}...")
    os.remove(filepath)

def rename(filename: str, new_filename: str):
    print(f"Renaming    {filename} to {new_filename}...")
    os.rename(filename, new_filename)

def download_rag_docs():
    json = get_json_from_file(SOURCES_FILE)

    for source in json["zip_sources"]:
        # NVD feeds land in their own subdirectory because the pruning step reads raw
        # feeds from there and writes the pruned files back into rag-docs/. Keeping
        # them apart means neither step can consume its own output.
        target_dir = f"{RAG_DOCS_DIR}{source.get('subdirectory', '')}"
        os.makedirs(target_dir, exist_ok=True)

        final_path = f"{target_dir}{source['final_filename']}"
        if os.path.exists(final_path):
            print(f"File {final_path} already exists.\n***")
            continue

        download(source['url'], f"{TEMP_DIR}{source['zip_filename']}")
        extract(f"{TEMP_DIR}{source['zip_filename']}", target_dir)
        delete(f"{TEMP_DIR}{source['zip_filename']}")
        rename(f"{target_dir}{source['original_filename']}", final_path)
        print("***")

if __name__ == "__main__":
    create_temp_directory()
    download_rag_docs()

