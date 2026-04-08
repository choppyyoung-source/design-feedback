import type { ExportData, ExportAnnotation, AnnotationSeverity } from "@/types";

const SEVERITY_KEY: Record<AnnotationSeverity, string> = {
  "must-fix": "severity.mustFix",
  "should-fix": "severity.shouldFix",
  suggestion: "severity.suggestion",
  praise: "severity.praise",
};

export function exportToMarkdown(data: ExportData, t: (key: string) => string): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Design Feedback: ${data.reviewMeta.title}`);
  lines.push("");
  lines.push(`- **${t("export.markdownImageSize")}:** ${data.reviewMeta.dimensions}`);

  if (data.reviewMeta.designContext) {
    const ctx = data.reviewMeta.designContext;
    if (ctx.framework) lines.push(`- **${t("export.markdownFramework")}:** ${ctx.framework}`);
    if (ctx.stylingApproach) lines.push(`- **${t("export.markdownStyling")}:** ${ctx.stylingApproach}`);
    if (ctx.filePath) lines.push(`- **${t("export.markdownFile")}:** \`${ctx.filePath}\``);
    if (ctx.description) lines.push(`- **${t("export.markdownDescription")}:** ${ctx.description}`);
  }

  // Summary
  lines.push("");
  lines.push(`## ${t("export.markdownSummary")}`);
  const summaryParts: string[] = [];
  for (const [severity, count] of Object.entries(data.summary.bySeverity)) {
    if (count > 0) summaryParts.push(`${count} ${t(SEVERITY_KEY[severity as AnnotationSeverity])}`);
  }
  lines.push(summaryParts.join(", "));

  // Group by severity
  // Exclude "praise" from AI export
  const severityOrder: AnnotationSeverity[] = ["must-fix", "should-fix", "suggestion"];

  for (const severity of severityOrder) {
    const group = data.annotations.filter((a) => a.severity === severity);
    if (group.length === 0) continue;

    lines.push("");
    lines.push(`## ${t(SEVERITY_KEY[severity])}`);

    for (const annotation of group) {
      lines.push("");
      lines.push(formatAnnotation(annotation, t));
    }
  }

  lines.push("");
  lines.push("---");
  lines.push(`*${t("export.markdownFooter")}*`);

  return lines.join("\n");
}

function formatAnnotation(a: ExportAnnotation, t: (key: string) => string): string {
  const lines: string[] = [];

  // Title: use OCR text if available, fallback to position
  const label = a.areaLabel
    ? `"${a.areaLabel}" ${t("export.markdownArea")}`
    : `${a.position.region} ${t("export.markdownArea")}`;

  if (a.regionBounds) {
    const r = a.regionBounds;
    lines.push(
      `### #${a.index} — ${label} (${r.width}x${r.height}px, ${t("export.markdownCoord")} ${r.x},${r.y})`
    );
  } else {
    lines.push(
      `### #${a.index} — ${label} (${a.position.xPx}px, ${a.position.yPx}px)`
    );
  }

  lines.push("");
  lines.push(`> ${a.comment}`);

  // Include reference images if attached
  if (a.imageUrls?.length) {
    lines.push("");
    for (let i = 0; i < a.imageUrls.length; i++) {
      lines.push(`- ${t("export.markdownReferenceImage")} ${i + 1}: ${a.imageUrls[i]}`);
    }
  }

  return lines.join("\n");
}
