# The agent chat api: one route, POST /chat, that forwards a message to the assistant's /turn.
# The session id travels as x-session-id, so each browser tab keeps its own conversation.
# Nothing is stored here: the assistant keeps the checkpoints.
import json
import os
import re
import urllib.error
import urllib.request

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# The assistant has no host port: this name resolves on the stack's Docker network (the api's params set it).
ASSISTANT_URL = os.environ.get("ASSISTANT_URL", "http://assistant:3000")
SESSION = re.compile(r"^[A-Za-z0-9_-]{1,128}$")

app = FastAPI(title="api")

# The demo web calls this api from another *.localhost origin during local runs.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://[a-z0-9.-]+\.localhost(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@app.get("/")
def root() -> dict[str, object]:
    return {"service": "api", "version": "1.0.0", "endpoints": ["/health", "/chat"]}


def ask_assistant(text: str, session_id: str) -> str:
    request = urllib.request.Request(
        f"{ASSISTANT_URL}/turn",
        data=json.dumps({"input": text}).encode(),
        headers={"content-type": "application/json", "x-session-id": session_id},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return str(json.load(response).get("reply", ""))


@app.post("/chat")
async def chat(request: Request) -> JSONResponse:
    try:
        body = await request.json()
    except ValueError:
        body = {}
    if not isinstance(body, dict):
        body = {}
    text = str(body.get("message") or "").strip()
    session_id = str(body.get("sessionId") or "")
    if not text:
        return JSONResponse({"error": "message is required"}, status_code=400)
    if not SESSION.match(session_id):
        return JSONResponse({"error": "sessionId is required"}, status_code=400)
    try:
        return JSONResponse({"reply": await run_in_threadpool(ask_assistant, text, session_id)})
    except urllib.error.HTTPError as err:
        return JSONResponse({"error": f"assistant answered HTTP {err.code}"}, status_code=502)
    except (OSError, ValueError) as err:
        print(f"chat: assistant unreachable: {err}", flush=True)
        return JSONResponse({"error": "assistant unreachable"}, status_code=502)
