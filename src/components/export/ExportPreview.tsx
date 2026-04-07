"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, FileText, Braces } from "lucide-react";
import type { Review, Annotation, AnnotationSeverity } from "@/types";
import { buildExportData } from "@/lib/export/build-export-data";
import { exportToMarkdown } from "@/lib/export/markdown";
import { exportToJSON } from "@/lib/export/json";

const SEVERITY_STYLE: Record<AnnotationSeverity, { dot: string; text: string; bg: string }> = {
  "must-fix": { dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
  "should-fix": { dot: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
  suggestion: { dot: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  praise: { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
};

const SEVERITY_LABEL: Record<AnnotationSeverity, string> = {
  "must-fix": "필수 수정",
  "should-fix": "수정 권장",
  suggestion: "제안",
  praise: "좋아요",
};

interface ExportPreviewProps {
  review: Review;
  annotations: Annotation[];
  onExportUsed?: (selectedIds: string[]) => void;
}

export function ExportPreview({ review, annotations, onExportUsed }: ExportPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"markdown" | "json">("markdown");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(annotations.map((a) => a.id))
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === annotations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(annotations.map((a) => a.id)));
    }
  };

  const selectedAnnotations = annotations.filter((a) => selected.has(a.id));

  const exportData = useMemo(
    () => buildExportData(review, selectedAnnotations),
    [review, selectedAnnotations]
  );

  const markdownOutput = useMemo(
    () => exportToMarkdown(exportData),
    [exportData]
  );
  const jsonOutput = useMemo(() => exportToJSON(exportData), [exportData]);

  const currentOutput = activeTab === "markdown" ? markdownOutput : jsonOutput;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onExportUsed?.(Array.from(selected));
  };

  const handleDownload = () => {
    const ext = activeTab === "markdown" ? "md" : "json";
    const type = activeTab === "markdown" ? "text/markdown" : "application/json";
    const blob = new Blob([currentOutput], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${review.title.replace(/\s+/g, "-").toLowerCase()}-review.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onExportUsed?.(Array.from(selected));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("markdown")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "markdown"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <FileText className="h-3 w-3" />
            Markdown
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "json"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Braces className="h-3 w-3" />
            JSON
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            onClick={handleCopy}
            disabled={selected.size === 0}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "복사됨" : "복사"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleDownload}
            disabled={selected.size === 0}
          >
            <Download className="h-3.5 w-3.5" />
            다운로드
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left: feedback selection */}
        <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs font-semibold text-foreground/70">
              피드백 선택 <span className="text-primary">{selected.size}</span>/{annotations.length}
            </span>
            <button
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleAll}
            >
              {selected.size === annotations.length ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {annotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                <p className="text-xs text-muted-foreground/50">디자이너 피드백이 없어요</p>
              </div>
            ) : (
              <div className="px-2 pb-2 space-y-0.5">
                {annotations.map((a) => {
                  const isOn = selected.has(a.id);
                  const style = SEVERITY_STYLE[a.severity];
                  return (
                    <button
                      key={a.id}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                        isOn
                          ? "bg-muted/60"
                          : "opacity-40 hover:opacity-70"
                      }`}
                      onClick={() => toggle(a.id)}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-4 h-4 rounded-md border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                          isOn ? "bg-foreground border-foreground" : "border-border"
                        }`}>
                          {isOn && <Check className="h-2.5 w-2.5 text-background" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${style.bg} ${style.text}`}>
                              <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                              {SEVERITY_LABEL[a.severity]}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                            {a.comment}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: preview */}
        <div className="flex-1 overflow-auto bg-muted/20">
          {selected.size === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground/40">내보낼 피드백을 선택해주세요</p>
            </div>
          ) : (
            <pre className="p-5 text-[13px] font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
              {activeTab === "markdown" ? markdownOutput : jsonOutput}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
