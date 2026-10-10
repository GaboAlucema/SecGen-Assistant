"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, FolderUp, Play, AlertTriangle, ShieldCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);

  const fileRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const startResize = (e) => {
    e.preventDefault();
    const onMove = (ev) => {
      setSidebarWidth(Math.min(480, Math.max(180, ev.clientX)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(ev.target.result);
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${baseUrl}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      console.log('DATOS DEL BACKEND:', data);
      setResult(data);
      setSelVuln(0);
      setActiveTab("vulns");
    } catch (err) {
      setError(err.message || "Error desconocido al contactar con el backend.");
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Zona de login (pendiente) */}
        <div className="h-8 w-40 rounded-md border border-dashed border-uiBorder flex items-center justify-center text-xs text-textMuted">
          Login
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Panel lateral: expandible/contraíble y redimensionable */}
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

        <div className="flex-1 min-w-0 h-full flex flex-col items-center overflow-y-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 relative">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Expandir panel"
              className="absolute top-3 left-3 text-textMuted hover:text-brand transition-colors"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

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
              {/* Resumen */}
              <div className="p-4 border-b border-uiBorder bg-bgApp">
                <div className="flex items-center gap-2 mb-1">
                  {vulnCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-alert-main" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-safe-main" />
                  )}
                  <h2 className="text-sm font-semibold text-textMain">Resumen del análisis</h2>
                </div>
                <p className="text-sm text-textMuted">{result.resumen}</p>
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
                    <div className="flex items-center gap-2 text-sm text-safe-main p-3 bg-safe-bg rounded-md">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      No se detectaron vulnerabilidades en el código analizado.
                    </div>
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
                              <p className="text-xs text-textMuted">{vuln.cwe}</p>
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
                  <DiffViewer
                    original={result.codigo_original}
                    modified={result.codigo_parcheado}
                    language={language}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
