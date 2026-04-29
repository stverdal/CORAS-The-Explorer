# CORAS Navigator

This is the CORAS Navigator. An LLM-Based Assistant for Cybersecurity Risk Assessment.

## Quick Start

Make sure to check `INSTALL.md` to download required dependencies and create your Conda virtual environment (`<env-name>`).

### In a first terminal

```
$ conda activate <env-name>

# On the first time, you would need to download necessary documents for RAG
(<env-name>) $ make download-rag-documents

(<env-name>) $ make navigator

# Optional: choose another local Ollama port
(<env-name>) $ make navigator OLLAMA_PORT=11436
```

### Use Ollama on another machine (SSH tunnel)

If Ollama runs on a remote machine, open a local SSH tunnel first:

```
$ conda activate <env-name>
(<env-name>) $ make ollama-tunnel SSH_TARGET=<user>@<remote-host> REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
```

That command stays in the foreground on purpose. After you authenticate, keep that terminal open and use another terminal for Navigator.

If you want the tunnel to detach instead, use:

```
$ conda activate <env-name>
(<env-name>) $ make ollama-tunnel-bg SSH_TARGET=<user>@<remote-host> REMOTE_OLLAMA_PORT=11434 OLLAMA_PORT=11435
```

Then, in another terminal, run Navigator against the forwarded local port:

```
$ conda activate <env-name>
(<env-name>) $ make navigator OLLAMA_HOSTNAME=localhost OLLAMA_PORT=11435
```

Notes:
- `OLLAMA_PORT` is the local forwarded port.
- `REMOTE_OLLAMA_PORT` is the Ollama port on the remote machine.
- Keep the `make ollama-tunnel` terminal open while using Navigator.
- `make ollama-tunnel-bg` starts the tunnel in the background and returns to the shell.

### In a second terminal

```
$ conda activate <env-name>
(<env-name>) $ make ui
```

You will now be able to access the CORAS Navigator at `http://localhost:1235/`.

If you want to exit, you can deactivate the virtual environment with:

```
(<env-name>) $ conda deactivate 
``` 

## Help

You can list available actions from the root of the project directory with:

```
$ make
```

## Tests

Run unit tests from the root of the project directory with:

```
$ conda activate <env-name>
(<env-name>) $ make test
```

## Dependencies

See `INSTALL.md`.

