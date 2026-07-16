from pydantic import BaseModel


class PromptRequest(BaseModel):
    code: str
    language: str


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
