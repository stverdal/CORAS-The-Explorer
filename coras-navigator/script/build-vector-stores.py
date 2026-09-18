"""
Builds the CAPEC, compliance and CVE vector stores without starting the API server.

Embedding the full NVD corpus takes hours, so on a server this is the step you want to
run detached, before anything needs to serve traffic. Stores already built from the
same source files are reloaded rather than rebuilt, so re-running is cheap and the
script is safe to resume after an interruption.

Respects the same environment as the server: OLLAMA_HOST and CORAS_NVD_YEARS.
"""

import os
import sys

NAVIGATOR_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The RAG modules resolve their document and store paths relative to the navigator
# directory, so enter it before importing them.
os.chdir(NAVIGATOR_DIR)
sys.path.insert(0, os.path.join(NAVIGATOR_DIR, "src"))
sys.path.insert(0, NAVIGATOR_DIR)

import app

if __name__ == "__main__":
    app.load_all_vector_stores()
