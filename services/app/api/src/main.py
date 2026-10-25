import os

from fastapi import FastAPI

app = FastAPI(title="api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


@app.get("/")
def root() -> dict[str, object]:
    return {"service": "api", "version": "1.0.0", "endpoints": ["/health"]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "3000")))
