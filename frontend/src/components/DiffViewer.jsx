"use client";

import { DiffEditor } from "@monaco-editor/react";

export default function DiffViewer({
  original = "",
  modified = "",
  language = "javascript",
  height = "70vh",
}) {
  return (
    <div className="rounded-lg border border-grayP-border overflow-hidden">
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
