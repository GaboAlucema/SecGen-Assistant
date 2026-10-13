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
    categoria: str = ""  # la asigna el backend a partir del CWE (ver SCOPE_CWES en llm_service)


class Metrics(BaseModel):
    duracion_s: float
    tokens_prompt: int
    tokens_generados: int
    tokens_por_s: float
    parches_aplicados: int
    parches_no_aplicados: int
    primer_hallazgo_s: float | None = None
    truncado: bool = False
    fuera_de_alcance: int = 0
    sin_evidencia: int = 0
    detenido: str | None = None  # motivo si el backend cortó la generación antes de tiempo


class PromptResponse(BaseModel):
    resumen: str
    vulnerabilidades: list[Vulnerability]
    codigo_original: str
    codigo_parcheado: str
    metricas: Metrics | None = None
