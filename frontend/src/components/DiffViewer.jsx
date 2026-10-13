"use client";

import { DiffEditor } from "@monaco-editor/react";

const LINE_HEIGHT = 19; // px por línea con fontSize 13 en Monaco
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 640;

export default function DiffViewer({
  original = "",
  modified = "",
  language = "javascript",
  height, // opcional: si no se indica, se ajusta al número de líneas
}) {
  // "100%" no sirve aquí: el contenedor no tiene altura propia y el editor colapsaba a 0 px
  // (se veía solo la línea del borde). Se calcula una altura en píxeles según el código.
  const lines = Math.max(original.split("\n").length, modified.split("\n").length);
  const editorHeight = height ?? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, lines * LINE_HEIGHT + 32));

  return (
    <div className="rounded-lg border border-grayP-border overflow-hidden">
      <DiffEditor
        height={editorHeight}
        language={language}
        original={original}
        modified={modified}
        theme="vs-light"
        loading={
          <div className="flex justify-center items-center h-full text-sm text-textMuted">
            Cargando diferencias...
          </div>
        }
        options={{
          readOnly: true,
          renderSideBySide: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
