"use client";

import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, setCode, language }) {
    const editorOptions = {
        minimap: { enabled: false }, 
        fontSize: 14,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        lineNumbersMinChars: 3,
        padding: { top: 16, bottom: 16 },
        overviewRulerLanes: 0,
    };

    return (
        <div className="w-full h-full min-h-[300px] border border-grayP-border rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-coral-mid transition-all">
            <Editor
                height="100%"
                language={language}
                theme="vs-light"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={editorOptions}
                loading={
                    <div className="flex justify-center items-center h-full text-grayP-text text-sm">
                        Cargando editor...
                    </div>
                }      
            />
        </div>
    );
}