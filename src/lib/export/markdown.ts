import type { ExportData, ExportAnnotation, AnnotationSeverity } from "@/types";

const SEVERITY_KO: Record<AnnotationSeverity, string> = {
  "must-fix": "필수 수정",
  "should-fix": "수정 권장",
  suggestion: "제안",
  praise: "좋아요",
};

export function exportToMarkdown(data: ExportData): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Design Feedback: ${data.reviewMeta.title}`);
  lines.push("");
  lines.push(`- **이미지 크기:** ${data.reviewMeta.dimensions}`);

  if (data.reviewMeta.designContext) {
    const ctx = data.reviewMeta.designContext;
    if (ctx.framework) lines.push(`- **프레임워크:** ${ctx.framework}`);
    if (ctx.stylingApproach) lines.push(`- **스타일링:** ${ctx.stylingApproach}`);
    if (ctx.filePath) lines.push(`- **파일:** \`${ctx.filePath}\``);
    if (ctx.description) lines.push(`- **설명:** ${ctx.description}`);
  }

  // Summary
  lines.push("");
  lines.push("## 요약");
  const summaryParts: string[] = [];
  for (const [severity, count] of Object.entries(data.summary.bySeverity)) {
    if (count > 0) summaryParts.push(`${count}개 ${SEVERITY_KO[severity as AnnotationSeverity]}`);
  }
  lines.push(summaryParts.join(", "));

  // Group by severity
  // "좋아요"는 AI 내보내기에서 제외
  const severityOrder: AnnotationSeverity[] = ["must-fix", "should-fix", "suggestion"];

  for (const severity of severityOrder) {
    const group = data.annotations.filter((a) => a.severity === severity);
    if (group.length === 0) continue;

    lines.push("");
    lines.push(`## ${SEVERITY_KO[severity]}`);

    for (const annotation of group) {
      lines.push("");
      lines.push(formatAnnotation(annotation));
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("*Design Feedback에서 내보냄. AI 도구에 붙여넣어 구현 제안을 받으세요.*");

  return lines.join("\n");
}

function formatAnnotation(a: ExportAnnotation): string {
  const lines: string[] = [];

  // Title: use OCR text if available, fallback to position
  const label = a.areaLabel
    ? `"${a.areaLabel}" 영역`
    : `${a.position.region} 영역`;

  if (a.regionBounds) {
    const r = a.regionBounds;
    lines.push(
      `### #${a.index} — ${label} (${r.width}x${r.height}px, 좌표 ${r.x},${r.y})`
    );
  } else {
    lines.push(
      `### #${a.index} — ${label} (${a.position.xPx}px, ${a.position.yPx}px)`
    );
  }

  lines.push("");
  lines.push(`> ${a.comment}`);

  return lines.join("\n");
}
