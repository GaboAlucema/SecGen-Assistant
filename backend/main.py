import json

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from core.llm_service import LLMService
from core.schemas import PromptRequest, PromptResponse

app = FastAPI(title="SecGen-Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://172.18.0.3:3000"],
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
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="No se pudo contactar al motor de inferencia (Ollama).")
    except (json.JSONDecodeError, ValidationError, KeyError):
        raise HTTPException(status_code=502, detail="El motor de inferencia devolvió una respuesta inválida.")
