import asyncio
import json
import logging
import os
import threading
import time
from contextlib import asynccontextmanager

import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from core.llm_service import LLMService
from core.schemas import PromptRequest, PromptResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

WARMUP_ENABLED = os.getenv("OLLAMA_WARMUP", "1") == "1"
WARMUP_INTERVAL = float(os.getenv("OLLAMA_WARMUP_INTERVAL", "1200"))  # segundos; < OLLAMA_KEEP_ALIVE


def _warmup_loop():
    """Precalienta el modelo al arrancar y lo mantiene cargado, para evitar el arranque en frío del Nodo 2."""
    log = logging.getLogger("warmup")
    while True:
        try:
            log.info("warmup del modelo OK en %.1fs", llm_service.warmup())
        except Exception as exc:  # el Nodo 2 puede estar apagado: no debe tumbar el backend
            log.warning("warmup omitido (%s: %s)", type(exc).__name__, exc)
        time.sleep(WARMUP_INTERVAL)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if WARMUP_ENABLED:
        threading.Thread(target=_warmup_loop, name="warmup", daemon=True).start()
    yield


app = FastAPI(title="SecGen-Assistant", lifespan=lifespan)

# Orígenes permitidos: localhost + cualquier host de la LAN configurada, solo en el puerto del frontend.
# Se ajusta con CORS_ORIGIN_REGEX (por defecto 192.168.1.0/24) sin tocar IPs de contenedores.
FRONTEND_PORT = os.getenv("FRONTEND_PORT", "3000")
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    rf"^http://(localhost|127\.0\.0\.1|192\.168\.1\.\d{{1,3}}):{FRONTEND_PORT}$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

llm_service = LLMService()


@app.get("/health")
def health_check():
    return {"status": "ok"}


def _error_detail(exc: Exception) -> str:
    """Mensaje para el cliente (sin trazas internas) según el tipo de fallo."""
    if isinstance(exc, requests.Timeout):
        return "El motor de inferencia (Ollama) tardó demasiado en responder."
    if isinstance(exc, requests.RequestException):
        return "No se pudo contactar al motor de inferencia (Ollama)."
    return "El motor de inferencia devolvió una respuesta inválida."


@app.post("/api/audit/stream")
async def audit_code_stream(request: PromptRequest, http_request: Request):
    """Auditoría con respuesta progresiva: una línea JSON (NDJSON) por evento.

    Tipos: inicio, progreso, resumen, vulnerabilidad, fin (resultado completo) y error.
    Si el cliente se desconecta, se cancela la generación en Ollama (no sigue gastando CPU en el Nodo 2).
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="El campo 'code' no puede estar vacío.")

    cancel = threading.Event()
    events_iter = llm_service.audit_events(request.code, request.language, cancel)
    done = object()

    async def events():
        try:
            while True:
                # next() bloquea hasta ~1 s (latido), por eso va en un hilo y no frena el servidor
                event = await asyncio.to_thread(next, events_iter, done)
                if event is done:
                    break
                yield json.dumps(event, ensure_ascii=False) + "\n"
                if await http_request.is_disconnected():
                    break
        except Exception as exc:  # el estado HTTP ya es 200: el fallo viaja como evento
            logging.getLogger(__name__).error("Fallo en auditoría (stream): %s: %s", type(exc).__name__, exc)
            yield json.dumps({"tipo": "error", "detalle": _error_detail(exc)}, ensure_ascii=False) + "\n"
        finally:
            cancel.set()  # corta la conexión con Ollama en el siguiente trozo (también si la tarea se cancela)

    return StreamingResponse(
        events(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/audit", response_model=PromptResponse)
def audit_code(request: PromptRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="El campo 'code' no puede estar vacío.")

    try:
        return llm_service.generate(request.code, request.language)
    except requests.Timeout:
        raise HTTPException(status_code=504, detail="El motor de inferencia (Ollama) tardó demasiado en responder.")
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="No se pudo contactar al motor de inferencia (Ollama).")
    except (json.JSONDecodeError, ValidationError, KeyError, TypeError):
        raise HTTPException(status_code=502, detail="El motor de inferencia devolvió una respuesta inválida.")
