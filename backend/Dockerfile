FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Sin privilegios de root dentro del contenedor
RUN useradd --system --no-create-home appuser
USER appuser

EXPOSE 8000

# Sin --reload: es un despliegue, no desarrollo
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT:-8000}"]
