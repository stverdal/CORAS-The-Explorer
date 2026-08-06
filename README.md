# CORAS Navigator

This is the CORAS Navigator. An LLM-Based Assistant for Cybersecurity Risk Assessment.
It generates comprehensive cyber threat models and diagrams based on the CORAS framework, now enhanced with real-world vulnerability data and legal compliance mapping.

## Key Features

- **Interactive Scoping & Human-in-the-loop:** Guide the LLM by explicitly defining _Threat Sources_ and _Assets_, giving you control over the assessment boundaries.
- **NVD & CVE Integration:** Dynamically retrieves relevant real-world vulnerabilities (CVEs) from the National Vulnerability Database using a dedicated RAG agent.
- **Legal CORAS Assessment:** Project technical cyber analysis onto legal frameworks. Automatically identify violations of major EU regulations (NIS2, GDPR, Cyber Resilience Act, AI Act, Cybersecurity Act) when specific risks are realized.
- **Custom LLM API Tokens:** Use your own commercial LLM API keys for faster generation and public deployment.
- **Optimized UI & Graph Rendering:** A step-by-step progressive workflow with an interactive canvas. Nodes (like vulnerabilities) feature "sticky" behaviors and auto-layout capabilities for clean, readable threat graphs.

## Quick Start

Set up your Python environment and dependencies by following `INSTALL.md`. Both Conda and pip + `venv` are supported.

### In a first terminal

```
$ # Activate your environment first
$ # Conda: conda activate <env-name>
$ # venv:  source .venv/bin/activate

# On the first time, you would need to download necessary documents for RAG
$ make download-rag-documents

$ make navigator

# Optional: choose another local Ollama port
$ make navigator OLLAMA_PORT=11436
```

### Use Ollama on another machine (SSH tunnel)

If Ollama runs on a remote machine, open a local SSH tunnel first:

```
$ # Activate your environment first
$ make ollama-tunnel SSH_TARGET=<user>@<remote-host> REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
```

That command stays in the foreground on purpose. After you authenticate, keep that terminal open and use another terminal for Navigator.

If you want the tunnel to detach instead, use:

```
$ # Activate your environment first
$ make ollama-tunnel-bg SSH_TARGET=<user>@<remote-host> REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
```

Then, in another terminal, run Navigator against the forwarded local port:

```
$ # Activate your environment first
$ make navigator OLLAMA_HOSTNAME=localhost OLLAMA_PORT=11435
```

Notes:

- `OLLAMA_PORT` is the local forwarded port.
- `REMOTE_OLLAMA_PORT` is the Ollama port on the remote machine.
- Keep the `make ollama-tunnel` terminal open while using Navigator.
- `make ollama-tunnel-bg` starts the tunnel in the background and returns to the shell.

### In a second terminal

```
$ # Activate your environment first
$ make ui
```

You will now be able to access the CORAS Navigator at `http://localhost:1235/`.

If you want to exit, deactivate your environment with the command that matches your setup:

```
$ conda deactivate
$ deactivate
```

## Data Mangement & Scripts

The CORAS Navigator relies on local databases for vulnerabilities and legal frameworks. You can update these databases using the provided scripts.

### Updating the Vulnerability Database (NVD)

The NVD database will download automatically withe the `make download-rag-documents` but you need to prune the data and build the vector database for the RAG agent (Note: this takes ~10 minutes):

```bash
$ make update-nvd
```

### Adding New Legal Frammeworks

To add new laws for the Legal Assessor, download the HTML file from EUR-Lex into the `rag-docs/laws_files` directory, and run the parser to generate the required JSON structure:

```bash
$ make update-laws
```

## Help

You can list available actions from the root of the project directory with:

```
$ make
```

## Tests

Run unit tests from the root of the project directory with:

```
$ # Activate your environment first
$ make test
```

## Dependencies

See `INSTALL.md`.
