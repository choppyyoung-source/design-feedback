import type {
  Annotation,
  AnnotationCategory,
  AnnotationSeverity,
  ExportAnnotation,
  ExportData,
  Review,
} from "@/types";
import { getRegion } from "./region";

export function buildExportData(
  review: Review,
  annotations: Annotation[]
): ExportData {
  const sorted = [...annotations].sort((a, b) => {
    const severityOrder: AnnotationSeverity[] = [
      "must-fix",
      "should-fix",
      "suggestion",
      "praise",
    ];
    return (
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );
  });

  const bySeverity = {
    "must-fix": 0,
    "should-fix": 0,
    suggestion: 0,
    praise: 0,
  } as Record<AnnotationSeverity, number>;

  const byCategory = {} as Record<AnnotationCategory, number>;

  for (const a of annotations) {
    bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
  }

  const exportAnnotations: ExportAnnotation[] = sorted.map((a, i) => ({
    index: i + 1,
    position: {
      xPx: a.pin_x_px,
      yPx: a.pin_y_px,
      xPct: Math.round(a.pin_x_pct),
      yPct: Math.round(a.pin_y_pct),
      region: getRegion(a.pin_x_pct, a.pin_y_pct),
    },
    regionBounds: a.region_bounds
      ? {
          x: a.region_bounds.xPx,
          y: a.region_bounds.yPx,
          width: a.region_bounds.wPx,
          height: a.region_bounds.hPx,
        }
      : null,
    areaLabel: a.area_label,
    category: a.category,
    severity: a.severity,
    comment: a.comment,
    changeSpec: a.change_spec,
    imageUrls: a.image_urls ?? [],
  }));

  return {
    reviewMeta: {
      title: review.title,
      dimensions: `${review.image_width}x${review.image_height}`,
      designContext: review.design_context,
      exportedAt: new Date().toISOString(),
      totalAnnotations: annotations.length,
    },
    summary: { bySeverity, byCategory },
    annotations: exportAnnotations,
  };
}
