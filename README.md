# CORAS Navigator

This is the CORAS Navigator. An LLM-Based Assistant for Cybersecurity Risk Assessment.

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

