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

// Nueva paleta mapeada a las severidades OWASP
const SEV = {
  Crítico: { bg: "bg-alert-bg", text: "text-alert-main", border: "border-alert-main", dot: "bg-alert-main" },
  Alto:    { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-400", dot: "bg-orange-500" }, // Tono intermedio nativo de Tailwind
  Medio:   { bg: "bg-warn-bg", text: "text-warn-text", border: "border-warn-main", dot: "bg-warn-main" },
  Bajo:    { bg: "bg-safe-bg", text: "text-safe-main", border: "border-safe-main", dot: "bg-safe-main" },
};

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("vulns");
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
      setResult(data);
      setSelVuln(0);
      setActiveTab("vulns");
    } catch (err) {
      setError("Error desconocido a cntactar con el backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const v = result?.vulnerabilidades?.[selVuln];

  return (
    <div className="min-h-screen bg-bgGeneral font-sans text-textDark">
      {/* HEADER */}
      <header className="border-b border-ui-border bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 border border-brandBlue text-xl">
            🛡️
          </div>
          <div>
            <h1 className="text-lg font-semibold text-textDark leading-tight">SecGen Assistant</h1>
            <p className="text-xs text-ui-textMuted">Auditor AppSec · Edge AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-safe-bg border border-safe-main px-3 py-1">
          <span className="text-xs">🔒</span>
          <span className="text-xs font-medium text-safe-main">Código Privado</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        
        {/* 1. ÁREA DE INGESTA */}
        <section className="rounded-xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border border-ui-border bg-bgGeneral px-3 py-1.5 text-sm text-textDark outline-none focus:ring-2 focus:ring-brandBlue"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
              
              <button 
                onClick={() => fileRef.current.click()} 
                className="flex items-center gap-2 rounded-md border border-ui-border bg-bgGeneral px-3 py-1.5 text-sm text-textDark hover:bg-gray-100 transition-colors"
              >
                📂 Subir archivo
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            </div>

            {code && <span className="text-xs text-ui-textMuted">{code.split("\n").length} líneas</span>}
          </div>

          <div className="h-[350px]">
            <CodeEditor code={code} setCode={setCode} language={language} />
          </div>

          <div className="mt-4 flex justify-end border-t border-ui-border pt-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !code.trim()}
              className="flex items-center gap-2 rounded-lg bg-brandBlue px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-all shadow-sm"
            >
              {isLoading ? "⏳ Analizando..." : "▶️ Auditar Código"}
            </button>
          </div>
        </section>

        {/* MENSAJE DE ERROR (ESTILO TARJETA DE ALERTA) */}
        {error && (
          <div className="rounded-lg border border-alert-main bg-alert-bg px-4 py-3 text-sm font-medium text-alert-main shadow-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* 2. PANEL DE RESULTADOS */}
        {result && (
          <section ref={resultsRef} className="rounded-xl border border-ui-border bg-white overflow-hidden shadow-sm">
            
            <div className="bg-blue-50 border-b border-ui-border p-4">
              <p className="text-sm font-medium text-brandBlue flex items-center gap-2">
                📊 {result.resumen}
              </p>
            </div>

            {result.vulnerabilidades?.length > 0 && (
              <div className="grid grid-cols-4 border-b border-ui-border bg-bgGeneral">
                {Object.entries(SEV).map(([sev, config]) => {
                  const count = result.vulnerabilidades.filter((v) => v.severidad === sev).length;
                  return (
                    <div key={sev} className="border-r last:border-0 border-ui-border p-3 text-center">
                      <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
                      <p className="text-xs font-medium text-ui-textMuted uppercase tracking-wider mt-1">{sev}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex border-b border-ui-border bg-bgGeneral">
              <button
                onClick={() => setActiveTab("vulns")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "vulns" ? "border-b-2 border-brandBlue text-brandBlue bg-white" : "text-ui-textMuted hover:text-textDark"}`}
              >
                🐞 Vulnerabilidades ({result.vulnerabilidades?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "diff" ? "border-b-2 border-brandBlue text-brandBlue bg-white" : "text-ui-textMuted hover:text-textDark"}`}
              >
                🔍 Vista Diff (Código Parcheado)
              </button>
            </div>

            {activeTab === "vulns" && (
              result.vulnerabilidades?.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-5xl mb-4 block">✅</span>
                  <h3 className="text-lg font-semibold text-safe-main">Código Seguro</h3>
                  <p className="text-sm text-ui-textMuted mt-2">No se detectaron vulnerabilidades OWASP en el fragmento analizado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[400px]">
                  
                  <div className="border-r border-ui-border p-3 space-y-2 max-h-[500px] overflow-y-auto">
                    {result.vulnerabilidades.map((vuln, i) => {
                      const s = SEV[vuln.severidad] || SEV.Bajo;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelVuln(i)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${selVuln === i ? "bg-blue-50 border-brandBlue" : "border-transparent hover:bg-bgGeneral"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></span>
                              <span className={`text-xs font-semibold ${s.text}`}>{vuln.severidad}</span>
                            </div>
                            <span className="text-[10px] text-ui-textMuted">{vuln.cwe}</span>
                          </div>
                          <p className="text-sm font-medium text-textDark leading-snug line-clamp-2">{vuln.nombre}</p>
                        </button>
                      );
                    })}
                  </div>

                  {v && (
                    <div className="p-6 max-h-[500px] overflow-y-auto">
                      <div className="flex gap-2 flex-wrap mb-4">
                        <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${SEV[v.severidad]?.bg} ${SEV[v.severidad]?.border} ${SEV[v.severidad]?.text}`}>{v.severidad}</span>
                        <span className="px-2.5 py-1 rounded-md border border-ui-border bg-bgGeneral text-textDark text-xs">{v.cwe}</span>
                        <span className="px-2.5 py-1 rounded-md border border-ui-border bg-bgGeneral text-textDark text-xs">{v.id}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-textDark mb-2">{v.nombre}</h3>
                      <p className="text-sm text-ui-textMuted mb-6 leading-relaxed">{v.descripcion}</p>

                      <div className="mb-6">
                        <h4 className="text-xs font-bold text-ui-textMuted uppercase tracking-wider mb-2">Vector de Ataque</h4>
                        <div className="bg-alert-bg border border-alert-main rounded-lg p-3">
                          <p className="text-sm text-alert-main font-medium leading-relaxed m-0">{v.vector}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <h4 className="text-xs font-bold text-alert-main mb-2">❌ Fragmento Vulnerable</h4>
                          <pre className="bg-alert-bg border border-alert-main rounded-lg p-3 text-xs text-alert-main font-mono overflow-x-auto whitespace-pre-wrap">{v.linea_original}</pre>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-safe-main mb-2">✓ Parche Sugerido</h4>
                          <pre className="bg-safe-bg border border-safe-main rounded-lg p-3 text-xs text-safe-main font-mono overflow-x-auto whitespace-pre-wrap">{v.linea_parcheada}</pre>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-ui-textMuted uppercase tracking-wider mb-2">💡 Justificación del Parche</h4>
                        <p className="text-sm text-textDark leading-relaxed">{v.explicacion_parche}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

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
