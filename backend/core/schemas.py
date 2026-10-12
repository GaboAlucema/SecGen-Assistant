import os

from pydantic import BaseModel, Field

# Límite de entrada configurable (MAX_CODE_CHARS) para poder ajustarlo según la capacidad del Nodo 2.
MAX_CODE_CHARS = int(os.getenv("MAX_CODE_CHARS", "15000"))


class PromptRequest(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_CHARS, description="Código fuente a auditar")
    language: str = Field(..., max_length=50, description="Lenguage de programación")


class Vulnerability(BaseModel):
    id: str
    nombre: str
    severidad: str
    cwe: str
    descripcion: str
    vector: str = ""
    linea_original: str = ""
    linea_parcheada: str = ""
    explicacion_parche: str = ""


class Metrics(BaseModel):
    duracion_s: float
    tokens_prompt: int
    tokens_generados: int
    tokens_por_s: float
    parches_aplicados: int
    parches_no_aplicados: int


class PromptResponse(BaseModel):
    resumen: str
    vulnerabilidades: list[Vulnerability]
    codigo_original: str
    codigo_parcheado: str
    metricas: Metrics | None = None
