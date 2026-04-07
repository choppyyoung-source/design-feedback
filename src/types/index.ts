export type AnnotationCategory =
  | "color"
  | "spacing"
  | "typography"
  | "layout"
  | "component"
  | "content"
  | "interaction"
  | "accessibility"
  | "other";

export type AnnotationSeverity =
  | "must-fix"
  | "should-fix"
  | "suggestion"
  | "praise";

export interface ChangeSpec {
  cssProperty?: string;
  currentValue?: string;
  suggestedValue?: string;
  tailwindFrom?: string;
  tailwindTo?: string;
}

export interface DesignContext {
  framework?: string;
  stylingApproach?: string;
  filePath?: string;
  description?: string;
}

export type ProjectStatus = "receiving" | "applying" | "completed";

export interface Project {
  id: string;
  name: string;
  base_url: string;
  status?: ProjectStatus;
  appliedCommentIds?: string[];
  completedAt?: string;
  completedImageUrl?: string;
  pages: ReviewPage[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewPage {
  id: string;
  title: string;
  url: string;
  image_url: string;
  image_width: number;
  image_height: number;
  description?: string;
}

// Legacy Review type (still used internally for canvas)
export interface Review {
  id: string;
  title: string;
  image_url: string;
  image_width: number;
  image_height: number;
  design_context: DesignContext | null;
  share_token: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RegionBounds {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  xPx: number;
  yPx: number;
  wPx: number;
  hPx: number;
}

export interface Annotation {
  id: string;
  review_id: string;
  pin_x_pct: number;
  pin_y_pct: number;
  pin_x_px: number;
  pin_y_px: number;
  region_bounds: RegionBounds | null;
  category: AnnotationCategory;
  severity: AnnotationSeverity;
  area_label: string;
  comment: string;
  change_spec: ChangeSpec | null;
  author_name: string;
  created_at: string;
  order_index: number;
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  comment: string;
  author_name: string;
  created_at: string;
}

// For export
export interface ExportData {
  reviewMeta: {
    title: string;
    dimensions: string;
    designContext: DesignContext | null;
    exportedAt: string;
    totalAnnotations: number;
  };
  summary: {
    bySeverity: Record<AnnotationSeverity, number>;
    byCategory: Record<AnnotationCategory, number>;
  };
  annotations: ExportAnnotation[];
}

export interface ExportAnnotation {
  index: number;
  position: {
    xPx: number;
    yPx: number;
    xPct: number;
    yPct: number;
    region: string;
  };
  regionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  areaLabel: string;
  category: AnnotationCategory;
  severity: AnnotationSeverity;
  comment: string;
  changeSpec: ChangeSpec | null;
}

export const CATEGORY_COLORS: Record<AnnotationCategory, string> = {
  color: "#EF4444",
  spacing: "#F59E0B",
  typography: "#8B5CF6",
  layout: "#3B82F6",
  component: "#10B981",
  content: "#EC4899",
  interaction: "#F97316",
  accessibility: "#06B6D4",
  other: "#6B7280",
};

export const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  color: "Color",
  spacing: "Spacing",
  typography: "Typography",
  layout: "Layout",
  component: "Component",
  content: "Content",
  interaction: "Interaction",
  accessibility: "Accessibility",
  other: "Other",
};

export const SEVERITY_LABELS: Record<AnnotationSeverity, string> = {
  "must-fix": "Must Fix",
  "should-fix": "Should Fix",
  suggestion: "Suggestion",
  praise: "Praise",
};

export const SEVERITY_ICONS: Record<AnnotationSeverity, string> = {
  "must-fix": "🔴",
  "should-fix": "🟡",
  suggestion: "🔵",
  praise: "🟢",
};

export const CATEGORY_LABELS_KO: Record<AnnotationCategory, string> = {
  color: "색상",
  spacing: "간격",
  typography: "타이포그래피",
  layout: "레이아웃",
  component: "컴포넌트",
  content: "콘텐츠",
  interaction: "인터랙션",
  accessibility: "접근성",
  other: "기타",
};

export const SEVERITY_LABELS_KO: Record<AnnotationSeverity, string> = {
  "must-fix": "필수 수정",
  "should-fix": "수정 권장",
  suggestion: "제안",
  praise: "칭찬",
};
