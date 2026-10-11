#!/usr/bin/env python3
"""Pruebas de carga contra el backend de SecGen Assistant (y, a través de él, el Nodo 2).

Solo usa la librería estándar. Ejemplos:

  python tests/stress_audit.py                       # corre las 8 muestras, una a una
  python tests/stress_audit.py --ladder              # escalera de tamaños: 1k..15k caracteres
  python tests/stress_audit.py --parallel 3          # las muestras con 3 peticiones simultáneas
  python tests/stress_audit.py --over-limit          # envía MAX+1 caracteres (debe devolver 422)
  python tests/stress_audit.py 01_flask_multi.py 05_memory_c.c --repeat 3
  python tests/stress_audit.py --url http://192.168.1.95:8000 --out resultados.json

Nota: Ollama en el Nodo 2 atiende UNA petición a la vez (OLLAMA_NUM_PARALLEL=1); con --parallel
las demás quedan en cola, por lo que su tiempo total incluye la espera.
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SAMPLES = Path(__file__).parent / "vuln_samples"
LANG = {".py": "python", ".js": "javascript", ".php": "php", ".java": "java", ".c": "c", ".go": "go"}
MAX_CHARS = 15000


def load_samples(names):
    files = [SAMPLES / n for n in names] if names else sorted(p for p in SAMPLES.iterdir() if p.suffix in LANG)
    return [(f.name, f.read_text(encoding="utf-8"), LANG.get(f.suffix, "text")) for f in files]


def ladder(sizes):
    """Arma payloads Python de tamaño creciente concatenando las muestras Python/JS/PHP (sin cortar a media línea)."""
    pool = "\n\n".join(f"# --- {n} ---\n{c}" for n, c, _ in load_samples(None))
    out = []
    for size in sizes:
        chunk = pool[:size]
        chunk = chunk[: chunk.rfind("\n")] if len(chunk) == size and "\n" in chunk else chunk
        out.append((f"ladder_{size}", chunk, "python"))
    return out


def audit(url, name, code, lang, timeout):
    body = json.dumps({"code": code, "language": lang}).encode()
    req = urllib.request.Request(f"{url}/api/audit", body, {"Content-Type": "application/json"})
    t0 = time.monotonic()
    row = {"nombre": name, "chars": len(code), "lang": lang}
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.load(r)
            m = data.get("metricas") or {}
            row.update(
                http=r.status, total_s=round(time.monotonic() - t0, 1), modelo_s=m.get("duracion_s"),
                tok_prompt=m.get("tokens_prompt"), tok_gen=m.get("tokens_generados"), tok_s=m.get("tokens_por_s"),
                vulns=len(data.get("vulnerabilidades", [])),
                cwes=sorted({v.get("cwe", "?") for v in data.get("vulnerabilidades", [])}),
                parches=f'{m.get("parches_aplicados")}/{(m.get("parches_aplicados") or 0) + (m.get("parches_no_aplicados") or 0)}',
            )
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = json.load(e).get("detail", "")
        except Exception:
            pass
        row.update(http=e.code, total_s=round(time.monotonic() - t0, 1), error=str(detail)[:120])
    except Exception as e:  # timeout, conexión, etc.
        row.update(http=0, total_s=round(time.monotonic() - t0, 1), error=f"{type(e).__name__}: {e}"[:120])
    return row


def print_table(rows):
    cols = ["nombre", "chars", "http", "total_s", "modelo_s", "tok_prompt", "tok_gen", "tok_s", "vulns", "parches"]
    widths = {c: max(len(c), *(len(str(r.get(c, "-"))) for r in rows)) for c in cols}
    print("  ".join(c.ljust(widths[c]) for c in cols))
    print("  ".join("-" * widths[c] for c in cols))
    for r in rows:
        print("  ".join(str(r.get(c, "-")).ljust(widths[c]) for c in cols))
        if r.get("error"):
            print(f"    ! {r['error']}")
        elif r.get("cwes"):
            print(f"    CWE: {', '.join(r['cwes'])}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", help="muestras de tests/vuln_samples (por defecto todas)")
    ap.add_argument("--url", default="http://192.168.1.95:8000", help="URL del backend (Nodo 1)")
    ap.add_argument("--ladder", action="store_true", help="escalera de tamaños 1k..15k caracteres")
    ap.add_argument("--sizes", default="1000,2000,4000,8000,12000,15000", help="tamaños para --ladder")
    ap.add_argument("--over-limit", action="store_true", help="enviar MAX_CODE_CHARS+1 (espera HTTP 422)")
    ap.add_argument("--parallel", type=int, default=1, help="peticiones simultáneas")
    ap.add_argument("--repeat", type=int, default=1, help="repeticiones de cada payload")
    ap.add_argument("--timeout", type=int, default=1800, help="timeout por petición (s)")
    ap.add_argument("--out", help="guardar resultados en JSON")
    a = ap.parse_args()

    try:
        urllib.request.urlopen(f"{a.url}/health", timeout=5).read()
    except Exception as e:
        sys.exit(f"Backend no responde en {a.url}/health: {e}")

    if a.over_limit:
        jobs = [("over_limit", "a = 1\n" * ((MAX_CHARS // 6) + 2), "python")]
    elif a.ladder:
        jobs = ladder([int(s) for s in a.sizes.split(",")])
    else:
        jobs = load_samples(a.files)
    jobs = jobs * a.repeat

    print(f"Backend: {a.url} | payloads: {len(jobs)} | paralelo: {a.parallel}\n")
    t0 = time.monotonic()
    rows = []
    with ThreadPoolExecutor(max_workers=max(1, a.parallel)) as ex:
        futs = [ex.submit(audit, a.url, n, c, l, a.timeout) for n, c, l in jobs]
        for f in futs:
            r = f.result()
            rows.append(r)
            print(f"[{len(rows)}/{len(jobs)}] {r['nombre']}: HTTP {r['http']} en {r['total_s']}s", flush=True)

    print()
    print_table(rows)
    ok = [r for r in rows if r["http"] == 200]
    print(f"\nTotal: {time.monotonic() - t0:.0f}s | OK {len(ok)}/{len(rows)}"
          + (f" | tiempo medio {sum(r['total_s'] for r in ok) / len(ok):.0f}s" if ok else ""))
    if a.out:
        Path(a.out).write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Resultados guardados en {a.out}")


if __name__ == "__main__":
    main()
