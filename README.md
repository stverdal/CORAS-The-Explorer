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

### Conda or no Conda

The two setups in `INSTALL.md` are not interchangeable. Pick one and use the matching commands throughout this README. If `conda --version` reports `command not found`, use the pip + `venv` path.

|                 | Conda                                                    | pip + `venv`                                                          |
| --------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Create          | `conda create -n <env-name> python=3.12.10`               | `python3.12 -m venv .venv`                                            |
| Activate        | `conda activate <env-name>`                               | `source .venv/bin/activate`                                           |
| Deactivate      | `conda deactivate`                                        | `deactivate`                                                          |
| Node.js and npm | installed into the env (`conda install conda-forge::nodejs`) | must already be on your system; install with your package manager |

**Activate your environment before running any `make` target.** The Makefile defaults to `PYTHON=python3`, which resolves to whatever `python3` comes first on your `PATH` — not automatically your environment. Without activating, `make navigator` and `make test` run against a Python that has none of the dependencies installed.

If you prefer not to activate, point the Makefile at the interpreter explicitly:

```
$ make navigator PYTHON=/path/to/.venv/bin/python
$ make test      PYTHON=/path/to/.venv/bin/python
```

Both paths install the same Python packages; `INSTALL.md` keeps that single authoritative list. Only the way you create, activate and leave the environment differs, along with where Node.js comes from.

### In a first terminal

```
$ # Activate your environment first
$ # Conda: conda activate <env-name>
$ # venv:  source .venv/bin/activate

# First time only: download documents and build the vector stores.
# Safe to re-run; anything already done is skipped.
$ make setup

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

## Setting up on a server

A GPU machine is worth it mainly for one thing: embedding the CVE corpus. That build is hours of work on a CPU and a fraction of it on a GPU. Generation can point anywhere, so the server does not have to host the model.

### 1. Install

```bash
$ git clone <repository-url>
$ cd CORAS-The-Explorer
$ python3.12 -m venv .venv
$ source .venv/bin/activate
$ pip install -U flask flask-cors langchain-ollama langchain-chroma chromadb requests beautifulsoup4
$ (cd ui && npm install)
```

See `INSTALL.md` for the Conda equivalent and the full dependency table.

### 2. Check

```bash
$ make check
```

This verifies Python, the packages, Node, the UI dependencies, that Ollama answers, that the embedding model is pulled, and that the RAG documents are present. It names whatever is missing and how to fix it, so run it before anything long.

If Ollama runs on this machine, confirm it sees the GPU:

```bash
$ ollama ps        # PROCESSOR should say GPU, not "100% CPU"
```

### 3. Set up the data

```bash
$ make setup
```

One command for the whole pipeline: pull the embedding model, download the CAPEC, CWE and NVD documents, prune the NVD feeds, and build all three vector stores. It is safe to re-run — anything already done is detected and skipped.

Expect this to take a while, and note that the NVD feeds are about 1.8 GB before pruning. Because the last step can run for hours, run it detached:

```bash
$ nohup make setup > setup.log 2>&1 &
$ tail -f setup.log
```

To bring the stack up sooner, build a single recent year first and add the rest later:

```bash
$ make setup CORAS_NVD_YEARS=2026
```

`make build-stores` repeats just the embedding step, without starting a server.

### 4. Run

Nothing in the stack needs a display, so a headless server is the normal case. Both processes are long-running, so start them under `tmux` (or `nohup`) and leave them:

```bash
$ tmux new -s coras
$ make navigator            # first pane
$ make ui                   # second pane, Ctrl-b " to split
$ # Ctrl-b d to detach; `tmux attach -t coras` to come back
```

Then browse from your own machine by forwarding both ports over SSH, still using `localhost` in the browser:

```bash
$ ssh -L 1235:localhost:1235 -L 5242:localhost:5242 <user>@<server>
```

Open `http://localhost:1235/` locally. Forward both ports: 1235 serves the page and the browser calls the API on 5242 itself, so forwarding only one will not work.

This is the recommended route, and it needs no firewall changes. The API is a Flask development server with debug enabled, so it should not be exposed on an untrusted network.

If you must reach it directly instead, bind the API to all interfaces and tell the UI where it lives. The UI address is inlined at build time, so it has to be set when the UI is built, not when it runs:

```bash
$ make navigator CORAS_API_HOST=0.0.0.0
$ make ui CORAS_NAVIGATOR_IP=<server-hostname>
```

Only do that behind a firewall or VPN.

### 5. Choose where generation runs

The server's GPU is not required for generation. Both work:

```bash
# Local models on the server's GPU
$ make navigator CORAS_LLM_PROVIDER=ollama CORAS_LLM_MODEL=<model>

# Or an external service, leaving the GPU to embeddings
$ export CORAS_LLM_API_KEY=gsk_...
$ make navigator CORAS_LLM_PROVIDER=groq
```

See _Choosing the inference target_ for the full set of variables.

### Running models on the server's GPUs

With roughly 96 GB of VRAM across two cards, the Navigator's default model runs locally and no external service is needed. Approximate weights for the usual 4-bit builds:

| Model             | VRAM (approx.) | Fits                        |
| ----------------- | -------------- | --------------------------- |
| `gpt-oss:20b`     | ~13 GB         | one card, easily            |
| `qwen3:32b`       | ~20 GB         | one card                    |
| `llama3.3:70b`    | ~43 GB         | one card, tight with context |
| `qwen2.5:72b`     | ~47 GB         | spread across both          |
| `gpt-oss:120b`    | ~65 GB         | spread across both          |

Add headroom for the KV cache on top of the weights. The native Ollama adapter requests `num_ctx: 16384` (`llm_adapters.py`), which is a deliberate choice — the assessor prompts are long — but at 70B-class sizes that cache costs several GB, so a model that looks like it fits on one card often does not.

To put one large model across both cards:

```bash
$ export OLLAMA_SCHED_SPREAD=1
$ export OLLAMA_FLASH_ATTENTION=1     # smaller KV cache
$ ollama serve
```

Embeddings and generation are separate models, and both stay resident if you let them:

```bash
$ export OLLAMA_MAX_LOADED_MODELS=2   # per GPU
$ export OLLAMA_KEEP_ALIVE=30m        # avoid reloading between pipeline stages
```

That matters here because a single analysis alternates between the embedding model and the chat model many times; without it, Ollama evicts and reloads repeatedly.

Then point the Navigator at the local model:

```bash
$ make navigator CORAS_LLM_PROVIDER=ollama CORAS_LLM_MODEL=qwen2.5:72b
```

Note that VRAM does not help the vector store build. `Chroma.from_documents` assembles the whole document list in **system** RAM before writing, so if you split the CVE build with `CORAS_NVD_YEARS`, that is a host-memory decision rather than a GPU one. The whole corpus is only a few GB of `Document` objects, so on a machine with plenty of RAM there is no reason to split it at all — build every year in one pass.

## Choosing the inference target

The Navigator can run against local Ollama or an external inference service. Every model call — the assessors, the summarizer, the formatter, and the RAG re-ranking and law filtering — goes through the selected target.

Pick it in either of two places:

- **In the UI**, under _Settings_: Provider, Model Name and, for external services, an API key. This overrides the server default for your session.
- **On the server**, with `CORAS_LLM_*` environment variables. The UI starts on whatever the server was launched with, so a shared deployment needs no per-user setup.

| Variable              | Meaning                                                             | Default        |
| --------------------- | ------------------------------------------------------------------- | -------------- |
| `CORAS_LLM_PROVIDER`  | `ollama`, `openai`, `groq`, or `custom_openai_compatible`           | `ollama`       |
| `CORAS_LLM_MODEL`     | Model name as the provider spells it                                 | `qwen2.5:72b`  |
| `CORAS_LLM_API_KEY`   | API key for the external service. Never sent to the browser.         | _(empty)_      |
| `CORAS_LLM_BASE_URL`  | Endpoint for `custom_openai_compatible` (LMStudio, vLLM, …)          | _(empty)_      |
| `CORAS_LLM_MAX_TOKENS`| Completion budget per request                                        | `8192`         |

If the backend logs `the response hit the token limit and was truncated`, the model ran out of budget before finishing the diagram. Raise `CORAS_LLM_MAX_TOKENS`, or pick a model that does not spend its budget on reasoning tokens before answering.

The Model Name dropdown in _Settings_ is populated from the provider itself through `POST /coras_navigator_api/models`, using the server's key unless you supply your own. Speech, embedding and moderation models are filtered out, since they cannot answer a chat completion. If the provider cannot be reached, the dropdown falls back to a small built-in list and shows why.

### Groq

```
$ export CORAS_LLM_API_KEY=gsk_...
$ make navigator CORAS_LLM_PROVIDER=groq CORAS_LLM_MODEL=<model-id>
```

Export the key rather than putting it on the `make` command line, so it stays out of your shell history and out of `ps`.

Providers retire models, so do not copy a model id out of documentation. Leave `CORAS_LLM_MODEL` unset and pick from the Model Name dropdown in _Settings_, which lists what your key can actually reach. To see the same list from a terminal:

```
$ curl -s -X POST http://localhost:5242/coras_navigator_api/models \
	-H "Content-Type: application/json" \
	-d '{"llm_provider": "groq"}'
```

Whichever model you pick needs solid JSON-mode support: the formatter stage requests `response_format: {"type": "json_object"}` to build the CORAS diagram, and small models often fail there.

### OpenAI

```
$ export CORAS_LLM_API_KEY=sk-...
$ make navigator CORAS_LLM_PROVIDER=openai CORAS_LLM_MODEL=gpt-4o
```

### Any OpenAI-compatible endpoint (LMStudio, vLLM, a gateway)

```
$ make navigator CORAS_LLM_PROVIDER=custom_openai_compatible \
	CORAS_LLM_BASE_URL=http://localhost:1234/v1 \
	CORAS_LLM_MODEL=<model-name>
```

### Local Ollama (default)

```
$ make navigator OLLAMA_PORT=11434
```

`OLLAMA_HOSTNAME` and `OLLAMA_PORT` set the Ollama endpoint, including a port forwarded from a remote machine — see _Use Ollama on another machine_ above.

### Embeddings always stay local

Only the chat calls follow `CORAS_LLM_PROVIDER`. Retrieval embeddings always use Ollama with `nomic-embed-text`, because Groq serves no embeddings API and because a vector store must be queried with the same model that built it. **Ollama therefore has to be reachable even when generation runs on an external service.** Swapping the embedding backend means rebuilding every vector store in `vector-stores/`.

Embeddings run fine on CPU — they are a 137M-parameter model, and retrieval adds well under a second per query. What is expensive is the one-time index build; see _Building the vector stores_ below.

## Data Mangement & Scripts

The CORAS Navigator relies on local databases for vulnerabilities and legal frameworks. You can update these databases using the provided scripts.

### Building the vector stores

The first `make navigator` after downloading documents embeds every document into Chroma under `vector-stores/`. This is a one-time cost per corpus: later runs load the saved stores and start in seconds.

Embedding runs on Ollama with `nomic-embed-text`, and it works on CPU — no GPU is required. It is simply slow in bulk. Measured on an 8-core Intel Core Ultra 7 268V with no GPU:

| Workload                              | CPU throughput        | Time             |
| ------------------------------------- | --------------------- | ---------------- |
| One query at search time              | ~420 ms               | negligible       |
| CAPEC corpus (559 entries)            | ~8 docs/sec           | about 1 minute   |
| Laws corpus (5 regulations)           | ~8 docs/sec           | a few minutes    |
| NVD, 5 years as shipped (~200k CVEs)  | ~8 docs/sec           | **6-7 hours**    |

Interactive use is comfortable on CPU. Only the initial NVD build is long, and it is unattended and resumable by year.

To cut it down, load fewer years with `CORAS_NVD_YEARS`. Each year is roughly 18-57k CVEs, so a single recent year builds in about an hour on CPU. Note that the pruning step keeps every CVE regardless of severity — filtering by `metrics.severity` in `script/NVD_data_prunning.py` is the other way to shrink the corpus.

The default covers 2022-2026, which is 200,676 CVEs. All eight downloaded years come to 262,843 and about 0.8 GB of vectors, so on a well-resourced machine you may as well index the lot:

```bash
$ make setup CORAS_NVD_YEARS=2019,2020,2021,2022,2023,2024,2025,2026
```

### A quick smoke test

Waiting 6-7 hours to see whether the stack runs is not useful. `CORAS_NVD_YEARS` selects which NVD years to embed, so you can bring everything up on a small corpus first:

```bash
$ make navigator CORAS_NVD_YEARS=2026
```

For a build measured in minutes rather than an hour, point it at a subset you make yourself. Any `rag-docs/nvdcve-2.0-<name>.json` file works, and `<name>` is what you pass:

```bash
$ cd coras-navigator
$ python -c "
import json
src = json.load(open('rag-docs/nvdcve-2.0-2026.json'))
sub = [c for c in src if c.get('content') and c.get('metrics', {}).get('severity') in ('CRITICAL', 'HIGH')][:400]
json.dump(sub, open('rag-docs/nvdcve-2.0-smoke.json', 'w'), indent=2)
print(len(sub), 'CVEs')
"
$ cd ..
$ make navigator CORAS_NVD_YEARS=smoke OLLAMA_PORT=11434
```

That builds all three stores in a few minutes. Check the API is up:

```bash
$ curl http://localhost:5242/coras_navigator_api/config
```

Changing `CORAS_NVD_YEARS` rebuilds the CVE store on the next start; the CAPEC and compliance stores are unaffected and are reused. When you want the full corpus, drop the variable and let it run.

### Preparing the NVD data

`make setup` runs this for you; this section is for re-running it on its own.

`NVDRAG` cannot read the raw NVD feed: the feed is a JSON object with a `vulnerabilities` key, while the loader expects a flat list of pruned records. The pruning step converts one into the other, and the CVE store will not build without it.

```bash
$ make update-nvd
```

The downloader writes raw feeds into `rag-docs/NVD-2019-2026/` and the pruner writes the pruned files into `rag-docs/`, so neither step can consume its own output and both are safe to re-run.

Note that pruning keeps every CVE regardless of severity. Filtering on `metrics.severity` in `script/NVD_data_prunning.py` is the way to shrink the corpus.


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
