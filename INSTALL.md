# Installation

Step by step instructions to setup the development environment and install dependencies.

First, make sure to be in the project directory:

```
$ cd <project-directory>
```

## Conda virtual environment

Create a Conda virtual environment (with Python 3.12.10):

```
$ conda create -n <env-name> python=3.12.10
```

The environment name can be anything, e.g. `navigator.env`.

## pip + venv

If you prefer not to use Conda, create a local virtual environment with Python 3.12:

```
$ python3.12 -m venv .venv
$ source .venv/bin/activate
$ python -m pip install -U pip
```

## Dependencies

### Prerequisites

- **Ollama**, either on your machine or on a remote machine that you can reach through SSH port forwarding. See _Remote Ollama_ below.

- **Node.js and npm**, to run the UI. On the Conda path, Node.js is installed into the environment (see _User interface_ below). On the pip path, install Node.js and npm with your system package manager before running `npm install`.

### Python packages

Both paths need the same packages. This is the authoritative list:

| Package                        | Required by                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| `flask`, `flask-cors`          | `coras-navigator/app.py`, the API the UI calls                   |
| `langchain-ollama`             | LLM and embedding calls (`src/rag.py`, `src/assessor.py`)        |
| `langchain-chroma`, `chromadb` | the RAG vector stores in `src/rag.py`                            |
| `requests`                     | the Ollama HTTP adapter and `make download-rag-documents`        |
| `beautifulsoup4`               | `make update-laws` (`script/parse_laws.py`)                      |

Install them with Conda:

```
$ conda activate <env-name>

# Served by the Anaconda and conda-forge channels
(<env-name>) $ conda install anaconda::flask anaconda::flask-cors

# The RAG and LLM stack is only published on PyPI
(<env-name>) $ pip install -U langchain-ollama langchain-chroma chromadb requests beautifulsoup4
```

Or with pip only:

```
$ source .venv/bin/activate

(.venv) $ pip install -U \
	flask \
	flask-cors \
	langchain-ollama \
	langchain-chroma \
	chromadb \
	requests \
	beautifulsoup4
```

### User interface

On the Conda path, install Node.js into the environment first:

```
(<env-name>) $ conda install conda-forge::nodejs
```

Then, on either path:

```
$ cd ui
$ npm install
```

When you are finished, deactivate with the command that matches your setup: `conda deactivate` for Conda, `deactivate` for `venv`.

## Run

See `README.md`.

### Remote Ollama (optional)

To use Ollama running on another machine, SSH tunnel the remote Ollama port to a local port and run Navigator with that local port. Example:

```
$ make ollama-tunnel SSH_TARGET=<user>@<remote-host> REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
$ make navigator OLLAMA_HOSTNAME=localhost OLLAMA_PORT=11435
```

`make ollama-tunnel` stays attached in the foreground by design. To start the tunnel and return to your shell immediately, use:

```
$ make ollama-tunnel-bg SSH_TARGET=<user>@<remote-host> REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
```
