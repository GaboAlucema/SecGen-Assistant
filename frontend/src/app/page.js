"use client";

import { useState, useRef, useEffect } from "react";
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

const SEV = {
  Crítico: { bg: "bg-redP-bg", text: "text-redP-text", border: "border-redP-border", dot: "bg-red-500" },
  Alto:    { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-500" },
  Medio:   { bg: "bg-coral-bg", text: "text-coral-strong", border: "border-coral-mid", dot: "bg-coral-strong" },
  Bajo:    { bg: "bg-greenP-bg", text: "text-greenP-text", border: "border-greenP-border", dot: "bg-green-600" },
}

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("vulns"); // 'vulns' | 'diff'
  const [selVuln, setSelVuln] = useState(0);
  
  const fileRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(ev.target.result);
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.detail || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setSelVuln(0);
      setActiveTab("vulns");
    } catch (err) {
      setError(err.message || "Error de conexión con el Backend. Verifica si el contenedor está corriendo");
    } finally {
      setIsLoading(false);
    }
  };

  const v = result?.vulnerabilidades?.[selVuln];

  return (
    <div className="min-h-screen bg-grayP-bg font-sans text-grayP-dark">
      {/* HEADER */}
      <header className="border-b border-grayP-border bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral-bg border border-coral-mid text-xl">
            🛡️
          </div>
          <div>
            <h1 className="text-lg font-semibold text-grayP-dark leading-tight">SecGen Assistant</h1>
            <p className="text-xs text-grayP-text">Auditor AppSec · Edge AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-greenP-bg border border-greenP-border px-3 py-1">
          <span className="text-xs">🔒</span>
          <span className="text-xs font-medium text-greenP-text">Código Privado</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        
        {/* 1. ÁREA DE INGESTA */}
        <section className="rounded-xl border border-grayP-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border border-grayP-border bg-grayP-bg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-coral-mid"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
              
              <button 
                onClick={() => fileRef.current.click()} 
                className="flex items-center gap-2 rounded-md border border-grayP-border bg-grayP-bg px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors"
              >
                📂 Subir archivo
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            </div>

            {code && <span className="text-xs text-grayP-text">{code.split("\n").length} líneas</span>}
          </div>

          <div className="h-[350px]">
            <CodeEditor code={code} setCode={setCode} language={language} />
          </div>

          <div className="mt-4 flex justify-end border-t border-grayP-border pt-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !code.trim()}
              className="flex items-center gap-2 rounded-lg bg-coral-bg border border-coral-strong px-6 py-2 text-sm font-semibold text-coral-strong disabled:opacity-50 disabled:cursor-not-allowed hover:bg-coral-mid hover:text-white transition-all"
            >
              {isLoading ? "⏳ Analizando..." : "▶️ Auditar Código"}
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-redP-border bg-redP-bg px-4 py-3 text-sm text-redP-text">
            ⚠️ {error}
          </div>
        )}

        {/* 2. PANEL DE RESULTADOS */}
        {result && (
          <section ref={resultsRef} className="rounded-xl border border-grayP-border bg-white overflow-hidden shadow-sm">
            
            {/* Resumen */}
            <div className="bg-coral-bg border-b border-grayP-border p-4">
              <p className="text-sm font-medium text-coral-text flex items-center gap-2">
                📊 {result.resumen}
              </p>
            </div>

            {/* Métricas de Severidad */}
            {result.vulnerabilidades?.length > 0 && (
              <div className="grid grid-cols-4 border-b border-grayP-border bg-gray-50/50">
                {Object.entries(SEV).map(([sev, config]) => {
                  const count = result.vulnerabilidades.filter((v) => v.severidad === sev).length;
                  return (
                    <div key={sev} className="border-r last:border-0 border-grayP-border p-3 text-center">
                      <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
                      <p className="text-xs font-medium text-grayP-text uppercase tracking-wider mt-1">{sev}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pestañas de Navegación */}
            <div className="flex border-b border-grayP-border bg-gray-50/50">
              <button
                onClick={() => setActiveTab("vulns")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "vulns" ? "border-b-2 border-coral-strong text-coral-strong bg-white" : "text-grayP-text hover:text-grayP-dark"}`}
              >
                🐞 Vulnerabilidades ({result.vulnerabilidades?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "diff" ? "border-b-2 border-coral-strong text-coral-strong bg-white" : "text-grayP-text hover:text-grayP-dark"}`}
              >
                🔍 Vista Diff (Código Parcheado)
              </button>
            </div>

            {/* Contenido: Pestaña Vulnerabilidades */}
            {activeTab === "vulns" && (
              result.vulnerabilidades?.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-5xl mb-4 block">✅</span>
                  <h3 className="text-lg font-semibold text-greenP-text">Código Seguro</h3>
                  <p className="text-sm text-grayP-text mt-2">No se detectaron vulnerabilidades OWASP en el fragmento analizado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[400px]">
                  
                  {/* Índice Lateral */}
                  <div className="border-r border-grayP-border p-3 space-y-2 max-h-[500px] overflow-y-auto">
                    {result.vulnerabilidades.map((vuln, i) => {
                      const s = SEV[vuln.severidad] || SEV.Bajo;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelVuln(i)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${selVuln === i ? "bg-coral-bg border-coral-mid" : "border-transparent hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></span>
                              <span className={`text-xs font-semibold ${s.text}`}>{vuln.severidad}</span>
                            </div>
                            <span className="text-[10px] text-grayP-text">{vuln.cwe}</span>
                          </div>
                          <p className="text-sm font-medium text-grayP-dark leading-snug line-clamp-2">{vuln.nombre}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Detalle (Side-by-Side) */}
                  {v && (
                    <div className="p-6 max-h-[500px] overflow-y-auto">
                      <div className="flex gap-2 flex-wrap mb-4">
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${SEV[v.severidad]?.bg} ${SEV[v.severidad]?.border} ${SEV[v.severidad]?.text}`}>{v.severidad}</span>
                        <span className="px-2.5 py-1 rounded-md border border-grayP-border bg-grayP-bg text-grayP-dark text-xs">{v.cwe}</span>
                        <span className="px-2.5 py-1 rounded-md border border-grayP-border bg-grayP-bg text-grayP-dark text-xs">{v.id}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-grayP-dark mb-2">{v.nombre}</h3>
                      <p className="text-sm text-grayP-text mb-6 leading-relaxed">{v.descripcion}</p>

                      <div className="mb-6">
                        <h4 className="text-xs font-bold text-grayP-text uppercase tracking-wider mb-2">Vector de Ataque</h4>
                        <div className="bg-redP-bg border border-redP-border rounded-lg p-3">
                          <p className="text-sm text-redP-text leading-relaxed m-0">{v.vector}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <h4 className="text-xs font-bold text-redP-text mb-2">❌ Fragmento Vulnerable</h4>
                          <pre className="bg-redP-bg border border-redP-border rounded-lg p-3 text-xs text-redP-text font-mono overflow-x-auto whitespace-pre-wrap">{v.linea_original}</pre>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-greenP-text mb-2">✓ Parche Sugerido</h4>
                          <pre className="bg-greenP-bg border border-greenP-border rounded-lg p-3 text-xs text-greenP-text font-mono overflow-x-auto whitespace-pre-wrap">{v.linea_parcheada}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-grayP-text uppercase tracking-wider mb-2">💡 Justificación del Parche</h4>
                        <p className="text-sm text-grayP-dark leading-relaxed">{v.explicacion_parche}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Contenido: Pestaña Vista Diff */}
            {activeTab === "diff" && (
              <div className="p-4">
                <div className="h-[450px]">
                  <DiffViewer
                    original={result.codigo_original || code}
                    modified={result.codigo_parcheado || code}
                    language={language}
                  />
                </div>
              </div>
            )}
            
          </section>
        )}
      </main>
    </div>
  );
}
