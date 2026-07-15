# SecGen Assistant 🛡️

Auditor de código automatizado basado en Edge AI, diseñado para mitigar riesgos sistémicos introducidos por el desarrollo asistido por IA (*vibecoding*).

## Arquitectura (Topología Descentralizada)
Este proyecto opera bajo una arquitectura de microservicios en red local (LAN) para garantizar la **privacidad absoluta del código fuente corporativo**:
- **Nodo 1 (Cliente/App):** Orquestador de contenedores (Docker) corriendo Frontend (Next.js) y Backend API (FastAPI).
- **Nodo 2 (Edge AI):** Servidor de inferencia dedicado (Ubuntu Server) ejecutando **Ollama** con el modelo `secgen-senior` (Qwen 7B).

## Despliegue Local
1. Copiar el archivo de entorno: `cp .env.example .env`
2. Levantar la infraestructura: `docker-compose up --build -d`
3. Acceder a la interfaz web en `http://localhost:3000`