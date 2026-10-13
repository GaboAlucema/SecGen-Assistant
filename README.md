# SecGen Assistant 🛡️

Auditor de código automatizado basado en Edge AI, diseñado para mitigar riesgos sistémicos introducidos por el desarrollo asistido por IA (*vibecoding*).

## Arquitectura (Topología Descentralizada)
Este proyecto opera bajo una arquitectura de microservicios en red local (LAN) para garantizar la **privacidad absoluta del código fuente corporativo**:
- **Nodo 1 (Cliente/App):** Orquestador de contenedores (Docker) corriendo Frontend (Next.js) y Backend API (FastAPI). (Este repositorio).
- **Nodo 2 (Edge AI):** Servidor de inferencia dedicado (Ubuntu Server) ejecutando **Ollama** con el modelo `secgen-senior` (Qwen 7B).

## Alcance del agente
El agente se concentra en cinco vectores (el resto de vulnerabilidades queda fuera de alcance y se omite):
- **SQL Injection** (CWE-89)
- **XSS** (CWE-79)
- **Secretos en el código** (CWE-798)
- **OWASP A01** – Control de acceso roto (IDOR, rutas sin autorización, path traversal, redirecciones abiertas, CSRF)
- **OWASP A07** – Fallas de identificación y autenticación (login débil o con credenciales fijas, JWT sin verificar, sesiones inseguras)

El alcance se aplica en tres capas: el *system prompt* (`backend/core/llm_service.py`), la clasificación de cada hallazgo
por CWE (`SCOPE_CWES`) y una guardia que descarta hallazgos sin evidencia en el código (línea inexistente o sin relación con
su categoría). Lo omitido se informa en `metricas.fuera_de_alcance` y `metricas.sin_evidencia`. Para ampliar el alcance en
el futuro basta con extender el prompt, `SCOPE_CWES` y `_EVIDENCE`.

Los resultados llegan en vivo (`POST /api/audit/stream`, NDJSON): cada hallazgo se muestra al completarse y el análisis
puede cancelarse. Más detalle y muestras de prueba en `tests/vuln_samples/EXPECTED.md`.

## Despliegue Local
1. Copiar el archivo de entorno: `cp .env.example .env`
2. Levantar la infraestructura: `docker-compose up --build -d`
3. Acceder a la interfaz web en `http://localhost:3000`
