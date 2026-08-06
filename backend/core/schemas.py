from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    code: str = Field(..., max_length=15000, description="Código fuente a auditar")
    language: str = Field(..., max_length=50, description="Lenguage de programación")


class Vulnerability(BaseModel):
    id: str
    nombre: str
    severidad: str
    cwe: str
    descripcion: str
    vector: str
    linea_original: str
    linea_parcheada: str
    explicacion_parche: str


class PromptResponse(BaseModel):
    resumen: str
    vulnerabilidades: list[Vulnerability]
    codigo_original: str
    codigo_parcheado: str
