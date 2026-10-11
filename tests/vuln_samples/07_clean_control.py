import hmac
import os
import secrets
import sqlite3
import subprocess
from pathlib import Path

from argon2 import PasswordHasher

BASE_DIR = Path("/var/app/uploads").resolve()
ph = PasswordHasher()
API_TOKEN = os.environ["API_TOKEN"]


def get_user(db: sqlite3.Connection, name: str):
    return db.execute("SELECT id, name FROM users WHERE name = ?", (name,)).fetchone()


def check_password(stored_hash: str, candidate: str) -> bool:
    try:
        return ph.verify(stored_hash, candidate)
    except Exception:
        return False


def read_upload(filename: str) -> bytes:
    target = (BASE_DIR / filename).resolve()
    if BASE_DIR not in target.parents:
        raise PermissionError("ruta fuera del directorio permitido")
    return target.read_bytes()


def ping(host: str) -> str:
    if not host.replace(".", "").replace("-", "").isalnum():
        raise ValueError("host invalido")
    return subprocess.run(["ping", "-c", "1", host], capture_output=True, text=True, timeout=5, check=False).stdout


def verify_token(provided: str) -> bool:
    return hmac.compare_digest(provided, API_TOKEN)


def new_session_id() -> str:
    return secrets.token_urlsafe(32)
