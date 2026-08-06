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

CORAS_DIR=coras-navigator
UI_DIR=ui

SRC_DIR=src
TEST_DIR=tests
SCRIPT_DIR=script
UPLOADS_DIR=uploaded-files

.PHONY: all navigator ui test download-rag-documents ollama-tunnel ollama-tunnel-bg rm-files-uploaded-by-user clean distclean

all: 
	@echo "Available targets: \n\
	navigator: Run the CORAS Navigator API server (uses OLLAMA_HOSTNAME/OLLAMA_PORT) \n\
        ui: Run the React app UI server \n\
        test: Run unit tests \n\
	download-rag-documents: Download documents for RAG\n\
	ollama-tunnel: Open SSH local port forwarding in the foreground\n\
	ollama-tunnel-bg: Open SSH local port forwarding in the background\n\
        clean: Clean cache and build files\n\
        distclean: Clean everything except sources"

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
	$(PYTHON) $(CORAS_DIR)/$(SRC_DIR)/$(SCRIPT_DIR)/NVD_data_pruning.py

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

