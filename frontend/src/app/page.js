"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, FolderUp, Play, AlertTriangle, ShieldCheck } from "lucide-react";
// Panel lateral (desactivado, pendiente de activar): requiere además PanelLeftClose y PanelLeftOpen
// import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import DiffViewer from "@/components/DiffViewer";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "php", label: "PHP" },
  { value: "go", label: "Go" },
];

// Paleta mapeada a las severidades OWASP
const SEV = {
  Crítico: { bg: "bg-alert-bg", text: "text-alert-main", border: "border-alert-main", dot: "bg-alert-main" },
  Alto: { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-400", dot: "bg-orange-500" }, // Tono intermedio nativo de Tailwind
  Medio: { bg: "bg-warn-bg", text: "text-warn-text", border: "border-warn-main", dot: "bg-warn-main" },
  Bajo: { bg: "bg-safe-bg", text: "text-safe-main", border: "border-safe-main", dot: "bg-safe-main" },
};

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("vulns");
  const [selVuln, setSelVuln] = useState(0);
  const [progress, setProgress] = useState(null); // último latido del backend: { fase, tokens, hallazgos }
  const [elapsed, setElapsed] = useState(0); // segundos desde que se pulsó "Auditar"

  // Panel lateral (desactivado, pendiente de activar)
  // const [sidebarOpen, setSidebarOpen] = useState(true);
  // const [sidebarWidth, setSidebarWidth] = useState(256);

  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortRef = useRef(null);

  // Desplazar a los resultados solo cuando aparecen (no en cada hallazgo que llega por streaming)
  const hasResults = Boolean(result);
  useEffect(() => {
    if (hasResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [hasResults]);

  // Cronómetro local mientras se analiza (sigue corriendo aunque el backend tarde en enviar datos)
  useEffect(() => {
    if (!isLoading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isLoading]);

  // Al salir de la página se cancela el análisis en curso (el backend corta la generación en el Nodo 2)
  useEffect(() => () => abortRef.current?.abort(), []);

  // Redimensionado del panel lateral (desactivado, pendiente de activar)
  // const startResize = (e) => {
  //   e.preventDefault();
  //   const onMove = (ev) => {
  //     setSidebarWidth(Math.min(480, Math.max(180, ev.clientX)));
  //   };
  //   const onUp = () => {
  //     window.removeEventListener("pointermove", onMove);
  //     window.removeEventListener("pointerup", onUp);
  //     document.body.style.userSelect = "";
  //   };
  //   document.body.style.userSelect = "none";
  //   window.addEventListener("pointermove", onMove);
  //   window.addEventListener("pointerup", onUp);
  // };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(ev.target.result);
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCancel = () => abortRef.current?.abort();

  // Aplica un evento del backend (stream NDJSON) al estado de la pantalla
  const applyEvent = (ev) => {
    switch (ev.tipo) {
      case "progreso":
        setProgress({ fase: ev.fase, tokens: ev.tokens, hallazgos: ev.hallazgos });
        break;
      case "resumen":
        setResult((r) => (r ? { ...r, resumen: ev.resumen } : r));
        break;
      case "vulnerabilidad":
        setResult((r) => (r ? { ...r, vulnerabilidades: [...r.vulnerabilidades, ev.datos] } : r));
        break;
      case "fin": {
        const { tipo, ...final } = ev;
        setResult(final);
        setProgress(null);
        break;
      }
      case "error":
        throw new Error(ev.detalle || "Error en el motor de inferencia.");
      default:
        break; // "inicio" u otros eventos informativos
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setProgress(null);
    // Los resultados aparecen de inmediato y se van completando a medida que llegan los hallazgos
    setResult({ resumen: "", vulnerabilidades: [], codigo_original: code, codigo_parcheado: null, metricas: null });
    setSelVuln(0);
    setActiveTab("vulns");

    let finished = false;
    try {
      // API explícita (build) o, por defecto, el mismo host que sirve el front en el puerto del backend.
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        `${window.location.protocol}//${window.location.hostname}:${process.env.NEXT_PUBLIC_BACKEND_PORT || 8000}`;

      const response = await fetch(`${baseUrl}/api/audit/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = typeof errData.detail === "string" ? errData.detail : null;
        throw new Error(
          detail ||
            (response.status === 422
              ? "El código supera el límite permitido o no es válido."
              : `Error del servidor: ${response.status}`)
        );
      }

      // El backend envía un evento JSON por línea; se procesan apenas llegan.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.tipo === "fin") finished = true;
          applyEvent(ev);
        }
      }
      if (!finished) {
        setError("La conexión se interrumpió antes de terminar el análisis. Se muestran los hallazgos recibidos.");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Análisis cancelado. Se muestran los hallazgos completados hasta ese momento.");
      } else {
        setError(err.message || "Error desconocido al contactar con el backend.");
      }
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const v = result?.vulnerabilidades?.[selVuln];
  const vulnCount = result?.vulnerabilidades?.length ?? 0;

  return (
    <main className="h-screen bg-bgApp flex flex-col overflow-hidden">
      {/* Barra superior: reserva el espacio para la zona de login */}
      <header className="h-14 shrink-0 bg-bgCard border-b border-uiBorder flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" />
          <span className="text-sm font-semibold text-textMain">SecGen Assistant</span>
        </div>
        {/* Zona de login (desactivada, pendiente de activar): el div se mantiene para conservar el espacio reservado.
            Para activarla, restaurar las clases y el texto de abajo:
            className="h-8 w-40 rounded-md border border-dashed border-uiBorder flex items-center justify-center text-xs text-textMuted"
            contenido: Login
        */}
        <div className="h-8 w-40" aria-hidden="true" />
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Panel lateral (desactivado, pendiente de activar): expandible/contraíble y redimensionable.
            No reserva espacio: el contenido principal queda centrado en todo el ancho.
            Para activarlo: descomentar el bloque de abajo y restaurar los imports,
            el estado (sidebarOpen, sidebarWidth) y startResize comentados más arriba.

        {sidebarOpen && (
          <>
            <aside
              style={{ width: sidebarWidth }}
              className="h-full shrink-0 bg-bgCard border-r border-uiBorder flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between p-3 border-b border-uiBorder">
                <span className="text-sm font-semibold text-textMain">Panel</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Contraer panel"
                  className="text-textMuted hover:text-brand transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </aside>
            <div
              onPointerDown={startResize}
              role="separator"
              aria-orientation="vertical"
              className="w-1 shrink-0 cursor-col-resize bg-uiBorder hover:bg-brand transition-colors"
            />
          </>
        )}
        */}

        <div className="flex-1 min-w-0 h-full flex flex-col items-center overflow-y-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 relative">
          {/* Botón para expandir el panel (desactivado junto con el panel lateral):
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Expandir panel"
              className="absolute top-3 left-3 text-textMuted hover:text-brand transition-colors"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
          */}

          {/* Título + contenedor principal agrupados */}
          <div className="w-full max-w-4xl xl:max-w-5xl flex flex-col flex-1">
            {/* 1. Título y Descripción */}
            <div className="w-full mb-4 text-center flex flex-col items-center shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-textMain mb-2 sm:mb-3">
                SecGen Assistant
              </h1>
              <p className="text-textMuted text-sm max-w-2xl">
                Pega tu fragmento de código fuente a continuación. Nuestro motor Edge AI analizará
                la estructura en busca de vulnerabilidades del OWASP Top 10 y debilidades CWE,
                generando sugerencias de parcheo en tiempo real y con total privacidad.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-alert/10 border border-alert text-alert rounded-md text-sm flex items-center justify-center gap-2 w-full max-w-2xl text-left">
                  <Shield className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* 2. Contenedor Principal de la Aplicación */}
            <div className="w-full bg-bgCard rounded-lg shadow-sm border border-uiBorder flex flex-col overflow-hidden transition-all duration-300 flex-1 min-h-[320px]">

              {/* Controles superiores: selector de lenguaje + carga de archivo */}
              <div className="flex items-center justify-between gap-3 p-4 border-b border-uiBorder bg-bgCard">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="border border-uiBorder rounded-md text-sm px-3 py-2 text-textMain bg-white focus:outline-none focus:ring-2 focus:ring-coral-mid"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>

                <input
                  ref={fileRef}
                  type="file"
                  onChange={handleFile}
                  className="hidden"
                  accept=".js,.jsx,.ts,.tsx,.py,.java,.php,.go,.txt"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-textMuted border border-uiBorder rounded-md px-3 py-2 hover:bg-bgApp transition-colors"
                >
                  <FolderUp className="w-4 h-4" />
                  Subir archivo
                </button>
              </div>

              {/* 3. Contenedor del Editor de Código */}
              <div className="w-full flex-1 min-h-[220px] p-4 bg-bgApp">
                <div className="w-full h-full rounded-lg border border-uiBorder overflow-hidden shadow-inner">
                  <CodeEditor
                    code={code}
                    onChange={setCode}
                    language={language}
                  />
                </div>
              </div>

              {/* 4. Pie de la tarjeta (Botón Auditar) */}
              <div className="flex items-center justify-end p-4 border-t border-uiBorder bg-bgCard">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !code.trim()}
                  className="bg-brand hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Analizando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4 fill-current" />
                      Auditar Código
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 5. Resultados */}
          {result && (
            <div
              ref={resultsRef}
              className="w-full max-w-4xl xl:max-w-5xl mt-8 mb-6 bg-bgCard rounded-lg shadow-sm border border-uiBorder overflow-hidden shrink-0"
            >
              {/* Estado en vivo: se muestra mientras el Nodo 2 trabaja */}
              {isLoading && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-uiBorder bg-bgCard">
                  <div className="flex items-center gap-2 text-sm text-textMuted">
                    <span className="animate-spin h-4 w-4 shrink-0 border-2 border-brand border-t-transparent rounded-full"></span>
                    {progress?.fase === "analizando" ? (
                      <span>
                        Analizando… {vulnCount} {vulnCount === 1 ? "hallazgo" : "hallazgos"} · {progress.tokens} tokens ·{" "}
                        {fmtTime(elapsed)}
                      </span>
                    ) : (
                      <span>Leyendo el código… {fmtTime(elapsed)}</span>
                    )}
                  </div>
                  <button
                    onClick={handleCancel}
                    className="text-xs text-textMuted border border-uiBorder rounded-md px-3 py-1 hover:bg-bgApp transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Resumen */}
              <div className="p-4 border-b border-uiBorder bg-bgApp">
                <div className="flex items-center gap-2 mb-1">
                  {vulnCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-alert-main" />
                  ) : isLoading ? (
                    <Shield className="w-4 h-4 text-textMuted" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-safe-main" />
                  )}
                  <h2 className="text-sm font-semibold text-textMain">Resumen del análisis</h2>
                </div>
                <p className="text-sm text-textMuted">
                  {result.resumen || (isLoading ? "Generando resumen…" : "")}
                </p>
                {result.metricas && (
                  <p className="text-xs text-textMuted mt-2">
                    Completado en {fmtTime(result.metricas.duracion_s)}
                    {result.metricas.primer_hallazgo_s != null &&
                      ` · primer hallazgo a los ${Math.round(result.metricas.primer_hallazgo_s)} s`}
                    {` · ${result.metricas.tokens_generados} tokens (${result.metricas.tokens_por_s} tok/s)`}
                  </p>
                )}
                {(result.metricas?.fuera_de_alcance ?? 0) + (result.metricas?.sin_evidencia ?? 0) > 0 && (
                  <p className="text-xs text-textMuted mt-1">
                    {(result.metricas.fuera_de_alcance ?? 0) + (result.metricas.sin_evidencia ?? 0)}{" "}
                    {(result.metricas.fuera_de_alcance ?? 0) + (result.metricas.sin_evidencia ?? 0) === 1
                      ? "hallazgo omitido"
                      : "hallazgos omitidos"}
                    : fuera del alcance del agente (SQL Injection, XSS, secretos en código, OWASP A01 y A07) o sin
                    evidencia en el código.
                  </p>
                )}
                {result.metricas?.truncado && (
                  <p className="text-xs text-warn-text bg-warn-bg border border-warn-main rounded-md p-2 mt-2">
                    {result.metricas.detenido
                      ? `Análisis detenido: ${result.metricas.detenido}. Se muestran los hallazgos válidos.`
                      : "La respuesta del modelo se cortó antes de terminar: se muestran los hallazgos completados."}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-uiBorder">
                <button
                  onClick={() => setActiveTab("vulns")}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === "vulns"
                    ? "text-brand border-b-2 border-brand"
                    : "text-textMuted hover:text-textMain"
                    }`}
                >
                  Vulnerabilidades ({vulnCount})
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === "diff"
                    ? "text-brand border-b-2 border-brand"
                    : "text-textMuted hover:text-textMain"
                    }`}
                >
                  Código parcheado
                </button>
              </div>

              {/* Contenido: Vulnerabilidades */}
              {activeTab === "vulns" && (
                <div className="p-4">
                  {vulnCount === 0 ? (
                    isLoading ? (
                      <div className="text-sm text-textMuted p-3 bg-bgApp rounded-md">
                        Los hallazgos aparecerán aquí a medida que se detecten.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-safe-main p-3 bg-safe-bg rounded-md">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        No se detectaron vulnerabilidades en el código analizado.
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Lista de vulnerabilidades */}
                      <div className="w-full md:w-[30%] flex flex-col gap-2">
                        {result.vulnerabilidades.map((vuln, i) => {
                          const sev = SEV[vuln.severidad] || SEV.Medio;
                          return (
                            <button
                              key={vuln.id ?? i}
                              onClick={() => setSelVuln(i)}
                              className={`text-left p-3 rounded-md border transition-colors ${i === selVuln
                                ? `${sev.bg} ${sev.border}`
                                : "border-uiBorder hover:bg-bgApp"
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                                <span className={`text-xs font-semibold ${sev.text}`}>
                                  {vuln.severidad}
                                </span>
                              </div>
                              <p className="text-sm text-textMain font-medium">{vuln.nombre}</p>
                              <p className="text-xs text-textMuted">
                                {vuln.cwe}
                                {vuln.categoria ? ` · ${vuln.categoria}` : ""}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Detalle de la vulnerabilidad seleccionada */}
                      {v && (
                        <div className="w-full md:w-[70%] border border-uiBorder rounded-md p-4 flex flex-col gap-3">
                          <div>
                            <span
                              className={`inline-block text-xs font-semibold px-2 py-1 rounded ${(SEV[v.severidad] || SEV.Medio).bg
                                } ${(SEV[v.severidad] || SEV.Medio).text}`}
                            >
                              {v.severidad} · {v.cwe}
                              {v.categoria ? ` · ${v.categoria}` : ""}
                            </span>
                            <h3 className="text-base font-semibold text-textMain mt-2">{v.nombre}</h3>
                          </div>

                          <p className="text-sm text-textMuted">{v.descripcion}</p>

                          <div>
                            <p className="text-xs font-semibold text-textMain mb-1">Vector de ataque</p>
                            <p className="text-sm text-textMuted">{v.vector}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-textMain mb-1">Línea original</p>
                            <pre className="text-xs bg-alert-bg text-alert-main p-2 rounded-md overflow-x-auto">
                              {v.linea_original}
                            </pre>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-textMain mb-1">Línea parcheada</p>
                            <pre className="text-xs bg-safe-bg text-safe-main p-2 rounded-md overflow-x-auto">
                              {v.linea_parcheada}
                            </pre>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-textMain mb-1">Explicación del parche</p>
                            <p className="text-sm text-textMuted">{v.explicacion_parche}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Contenido: Diff */}
              {activeTab === "diff" && (
                <div className="p-4">
                  {result.codigo_parcheado == null ? (
                    <div className="text-sm text-textMuted p-3 bg-bgApp rounded-md">
                      El código parcheado se genera al terminar el análisis.
                    </div>
                  ) : (
                    <DiffViewer
                      original={result.codigo_original}
                      modified={result.codigo_parcheado}
                      language={language}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
