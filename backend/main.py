import json
import logging
import os

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from core.llm_service import LLMService
from core.schemas import PromptRequest, PromptResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="SecGen-Assistant")

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
