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

- You should have Ollama available either on your machine or on a remote machine that you can reach through SSH port forwarding.

- You need Node.js and npm available to run the UI. In the Conda-based setup below, Node.js is installed with Conda. In the pip-only setup, install Node.js and npm with your system package manager before running `npm install`.

- Install dependencies with Conda:

```
$ conda activate <env-name>

# Using Ollama in Python
(<env-name>) $ conda install conda-forge::ollama-python

# Langchain and ChromaDb for the RAG module
(<env-name>) $ pip install -U langchain-ollama
(<env-name>) $pip install -U langchain-ollama chromadb

# Make the CORAS Navigator accessible to the User Interface
(<env-name>) $ conda install anaconda::flask anaconda::flask-cors

# User Interface
(<env-name>) $ conda install conda-forge::nodejs
(<env-name>) $ cd ui
(<env-name>) $ npm install

(<env-name>) $ conda deactivate
```

- Or install dependencies with pip only:

```
$ source .venv/bin/activate

# Python dependencies
(.venv) $ pip install \
	ollama \
	langchain \
	langchain-community \
	langchain-ollama \
	chromadb \
	flask \
	flask-cors \
	requests \
	pypdf

# User Interface
(.venv) $ cd ui
(.venv) $ npm install
```

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
