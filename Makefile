PYTHON=python3
OLLAMA_HOSTNAME=localhost
OLLAMA_PORT=11435
OLLAMA_HOST=$(OLLAMA_HOSTNAME):$(OLLAMA_PORT)

# Remote Ollama tunnel settings
# Example: make ollama-tunnel SSH_TARGET=user@remote-host REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
# Example: make ollama-tunnel-bg SSH_TARGET=user@remote-host REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
SSH_TARGET=
REMOTE_OLLAMA_HOST=localhost
REMOTE_OLLAMA_PORT=11434

# Inference target. Leave empty for local Ollama; the UI can always override it.
# Example: make navigator CORAS_LLM_PROVIDER=groq CORAS_LLM_MODEL=llama-3.3-70b-versatile
# Keep API keys out of your shell history: export CORAS_LLM_API_KEY=... beforehand.
CORAS_LLM_PROVIDER ?=
CORAS_LLM_MODEL ?=
CORAS_LLM_BASE_URL ?=
CORAS_LLM_API_KEY ?=
# Completion budget per request. Raise it if diagrams come back truncated.
CORAS_LLM_MAX_TOKENS ?=
# Which NVD years to embed. Empty = 2022-2026. One year is enough for a smoke test.
CORAS_NVD_YEARS ?=
export CORAS_NVD_YEARS
export CORAS_LLM_PROVIDER
export CORAS_LLM_MODEL
export CORAS_LLM_BASE_URL
export CORAS_LLM_API_KEY
export CORAS_LLM_MAX_TOKENS

# Where the API binds, and where the UI looks for it. Both default to localhost.
# On a server whose browser is elsewhere:
#   make navigator CORAS_API_HOST=0.0.0.0
#   make ui CORAS_NAVIGATOR_IP=<server-hostname>
CORAS_API_HOST ?=
CORAS_API_PORT ?=
CORAS_NAVIGATOR_IP ?=
CORAS_NAVIGATOR_PORT ?=
export CORAS_API_HOST
export CORAS_API_PORT
export CORAS_NAVIGATOR_IP
export CORAS_NAVIGATOR_PORT

EMBEDDING_MODEL=nomic-embed-text

CORAS_DIR=coras-navigator
UI_DIR=ui

SRC_DIR=src
TEST_DIR=tests
SCRIPT_DIR=script
UPLOADS_DIR=uploaded-files

.PHONY: all setup check pull-models build-stores navigator ui test download-rag-documents update-nvd update-laws ollama-tunnel ollama-tunnel-bg rm-files-uploaded-by-user clean distclean

all: 
	@echo "Available targets: \n\
	setup: One-shot install of data and vector stores (run this first) \n\
	check: Verify prerequisites are in place \n\
	pull-models: Pull the embedding model into Ollama \n\
	build-stores: Build the vector stores without starting the server \n\
	navigator: Run the CORAS Navigator API server (uses OLLAMA_HOSTNAME/OLLAMA_PORT) \n\
        ui: Run the React app UI server \n\
        test: Run unit tests \n\
	download-rag-documents: Download documents for RAG\n\
	ollama-tunnel: Open SSH local port forwarding in the foreground\n\
	ollama-tunnel-bg: Open SSH local port forwarding in the background\n\
        clean: Clean cache and build files\n\
        distclean: Clean everything except sources"

check:
	@echo "Checking prerequisites..."
	@command -v $(PYTHON) >/dev/null || { echo "  FAIL  $(PYTHON) not found"; exit 1; }
	@echo "  ok    python: $$($(PYTHON) --version 2>&1)"
	@$(PYTHON) -c "import flask, flask_cors, langchain_ollama, langchain_chroma, chromadb, requests, bs4" \
		2>/dev/null && echo "  ok    python packages installed" \
		|| { echo "  FAIL  missing python packages: see INSTALL.md"; exit 1; }
	@command -v node >/dev/null && echo "  ok    node: $$(node --version)" || echo "  WARN  node not found (needed for the UI)"
	@test -d $(UI_DIR)/node_modules && echo "  ok    ui dependencies installed" || echo "  WARN  run: cd $(UI_DIR) && npm install"
	@curl -sf -m 5 http://$(OLLAMA_HOST)/api/tags >/dev/null \
		&& echo "  ok    ollama reachable at $(OLLAMA_HOST)" \
		|| { echo "  FAIL  ollama unreachable at $(OLLAMA_HOST)"; exit 1; }
	@curl -sf -m 5 http://$(OLLAMA_HOST)/api/tags | grep -q "$(EMBEDDING_MODEL)" \
		&& echo "  ok    embedding model $(EMBEDDING_MODEL) present" \
		|| { echo "  FAIL  missing $(EMBEDDING_MODEL): run 'make pull-models'"; exit 1; }
	@test -f $(CORAS_DIR)/rag-docs/capec-detailed.json \
		&& echo "  ok    RAG documents downloaded" \
		|| echo "  WARN  run 'make setup' to download RAG documents"
	@echo "Prerequisites look good."

pull-models:
	@echo "Pulling $(EMBEDDING_MODEL) into Ollama at $(OLLAMA_HOST)..."
	OLLAMA_HOST=$(OLLAMA_HOST) ollama pull $(EMBEDDING_MODEL)

build-stores:
	@echo "Building vector stores (CORAS_NVD_YEARS=$${CORAS_NVD_YEARS:-all}). This can take hours."
	OLLAMA_HOST=$(OLLAMA_HOST) $(PYTHON) $(CORAS_DIR)/$(SCRIPT_DIR)/build-vector-stores.py

setup: pull-models download-rag-documents update-nvd build-stores
	@echo ""
	@echo "Setup complete. Start the API with 'make navigator' and the UI with 'make ui'."

navigator: rm-files-uploaded-by-user
	cd $(CORAS_DIR) && export OLLAMA_HOST=$(OLLAMA_HOST) && export PYTHONPATH=./$(SRC_DIR) && $(PYTHON) app.py

ollama-tunnel:
	@if [ -z "$(SSH_TARGET)" ]; then \
		echo "Missing SSH_TARGET. Example:"; \
		echo "  make ollama-tunnel SSH_TARGET=user@remote-host REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435"; \
		exit 1; \
	fi
	@echo "Forwarding local port $(OLLAMA_PORT) -> $(REMOTE_OLLAMA_HOST):$(REMOTE_OLLAMA_PORT) via $(SSH_TARGET)"
	@echo "This target stays attached. Leave it running and use another terminal for Navigator."
	ssh -N -L $(OLLAMA_PORT):$(REMOTE_OLLAMA_HOST):$(REMOTE_OLLAMA_PORT) $(SSH_TARGET)

ollama-tunnel-bg:
	@if [ -z "$(SSH_TARGET)" ]; then \
		echo "Missing SSH_TARGET. Example:"; \
		echo "  make ollama-tunnel-bg SSH_TARGET=user@remote-host REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435"; \
		exit 1; \
	fi
	@echo "Forwarding local port $(OLLAMA_PORT) -> $(REMOTE_OLLAMA_HOST):$(REMOTE_OLLAMA_PORT) via $(SSH_TARGET) in background"
	ssh -f -N -o ExitOnForwardFailure=yes -L $(OLLAMA_PORT):$(REMOTE_OLLAMA_HOST):$(REMOTE_OLLAMA_PORT) $(SSH_TARGET)
	@echo "SSH tunnel started in background."

ui: rm-files-uploaded-by-user
	cd $(UI_DIR) && npm start

test:
	cd $(CORAS_DIR) && export PYTHONPATH=./$(SRC_DIR) && $(PYTHON) $(TEST_DIR)/test.py

update-nvd:
	@echo "Updating NVD database (this takes ~10 minutes)..."
	cd $(CORAS_DIR) && $(PYTHON) $(SCRIPT_DIR)/NVD_data_prunning.py

update-laws:
	@echo "Parsing laws from HTML to JSON..."
	$(PYTHON) $(CORAS_DIR)/$(SCRIPT_DIR)/parse_laws.py

download-rag-documents:
	$(PYTHON) $(CORAS_DIR)/$(SCRIPT_DIR)/download-rag-docs.py && $(PYTHON) $(CORAS_DIR)/$(SCRIPT_DIR)/format-rag-docs.py

rm-files-uploaded-by-user:
	rm -rf $(CORAS_DIR)/$(UPLOADS_DIR)

clean: rm-files-uploaded-by-user
	rm -rf $(UI_DIR)/dist
	rm -rf $(UI_DIR)/.parcel-cache
	rm -rf $(CORAS_DIR)/$(SRC_DIR)/__pycache__
	rm -rf $(CORAS_DIR)/$(TEST_DIR)/__pycache__

distclean: clean
	rm -rf $(CORAS_DIR)/rag-docs/*
	rm -rf $(CORAS_DIR)/vector-stores/*

