"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Bell, Plus } from "lucide-react";
import type { Annotation, ProjectStatus, Review } from "@/types";
import { getUnseenCount } from "@/lib/notifications";
import { useT } from "@/lib/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReviewItem = { review: Review; annotations: Annotation[]; updatedAt: string; status?: ProjectStatus; [key: string]: any };

/*
 * DESIGN.md tokens applied:
 *
 * Card:
 *   - bg: #ffffff (Pure White)
 *   - border: 1px solid rgba(0,0,0,0.1) (Whisper Border)
 *   - radius: 12px (Comfortable — standard cards)
 *   - shadow: 4-layer stack (Card Shadow — Level 2)
 *   - hover: subtle shadow intensification
 *   - image top radius: 12px 12px 0 0
 *
 * Typography:
 *   - Card title: 14px weight 500 (Body Medium), color rgba(0,0,0,0.95)
 *   - Author: 14px weight 400 (Caption Light), color #a39e98
 *   - Meta: 12px weight 400 (Micro Label), color #a39e98
 *
 * Status badge (Pill Badge Button):
 *   - bg: #f2f9ff (Badge Blue Bg)
 *   - text: #097fe8 (Badge Blue Text)
 *   - radius: 9999px (Full Pill)
 *   - font: 12px weight 600 letter-spacing 0.125px
 *   - dot: semantic color per status
 *
 * Semantic colors:
 *   - receiving: Notion Blue (#0075de)
 *   - applying: Orange (#dd5b00)
 *   - completed: Green (#1aae39)
 */

const STATUS_PILL: Record<
  ProjectStatus,
  { labelKey: string; dotColor: string; bg: string; text: string }
> = {
  receiving: {
    labelKey: "status.receiving",
    dotColor: "#0075de",
    bg: "#f2f9ff",
    text: "#097fe8",
  },
  applying: {
    labelKey: "status.applyingShort",
    dotColor: "#dd5b00",
    bg: "#fff5ec",
    text: "#c44d00",
  },
  completed: {
    labelKey: "status.completedShort",
    dotColor: "#1aae39",
    bg: "#edfaef",
    text: "#158a2d",
  },
};

// DESIGN.md §2 Shadows — Card Shadow (Level 2): 4-layer stack
const cardShadow = "rgba(0,0,0,0.04) 0px 4px 18px, rgba(0,0,0,0.027) 0px 2.025px 7.84688px, rgba(0,0,0,0.02) 0px 0.8px 2.925px, rgba(0,0,0,0.01) 0px 0.175px 1.04062px";
const cardShadowHover = "rgba(0,0,0,0.06) 0px 6px 22px, rgba(0,0,0,0.04) 0px 3px 10px, rgba(0,0,0,0.03) 0px 1.2px 4px, rgba(0,0,0,0.015) 0px 0.3px 1.5px";

interface ReviewGridProps {
  reviews: ReviewItem[];
  onSelect: (review: Review, annotations: Annotation[]) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  emptyMessage: string;
  emptyDescription: string;
  showDelete?: boolean;
  hideNewButton?: boolean;
  showAuthor?: boolean;
}

export function ReviewGrid({
  reviews,
  onSelect,
  onDelete,
  onNew,
  emptyMessage,
  emptyDescription,
  showDelete = true,
  hideNewButton = false,
  showAuthor = false,
}: ReviewGridProps) {
  const t = useT();

  if (reviews.length === 0) {
    return (
      <div>
        {!hideNewButton && (
          <div
            className="relative cursor-pointer group/new"
            style={{ borderRadius: 12 }}
            onClick={onNew}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
              <rect
                className="dash-border"
                x="1" y="1"
                rx="12"
                strokeWidth="1"
                strokeDasharray="5 4"
                style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
              />
            </svg>
            <div className="p-14 text-center" style={{ borderRadius: 12 }}>
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 8, backgroundColor: "#f6f5f4" }}>
                <Plus className="h-5 w-5" style={{ color: "#a39e98" }} />
              </div>
              {/* Body Medium: 16px weight 500 */}
              <p style={{ fontSize: 16, fontWeight: 500, color: "rgba(0,0,0,0.95)", lineHeight: 1.5 }}>{t("grid.newLink")}</p>
              {/* Caption Light: 14px weight 400 */}
              <p style={{ fontSize: 14, fontWeight: 400, color: "#615d59", lineHeight: 1.43, marginTop: 2 }}>{t("grid.getDesignReview")}</p>
            </div>
          </div>
        )}
        {hideNewButton && (
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 12,
              boxShadow: cardShadow,
            }}
          >
            <div className="p-14 text-center">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 8, backgroundColor: "#f6f5f4" }}>
                <span className="text-lg">📋</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "rgba(0,0,0,0.95)", lineHeight: 1.5 }}>{emptyMessage}</p>
              <p style={{ fontSize: 14, fontWeight: 400, color: "#615d59", lineHeight: 1.43, marginTop: 2 }}>{emptyDescription}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* New link card */}
      {!hideNewButton && (
        <div
          className="h-full relative cursor-pointer group/new"
          style={{ borderRadius: 12 }}
          onClick={onNew}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
            <rect
              className="dash-border"
              x="1" y="1"
              rx="12"
              strokeWidth="1"
              strokeDasharray="5 4"
              style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
            />
          </svg>
          <div className="h-full flex flex-col items-center justify-center gap-1.5 overflow-hidden" style={{ borderRadius: 12 }}>
            <div className="w-9 h-9 flex items-center justify-center mb-0.5" style={{ borderRadius: 8, backgroundColor: "#f6f5f4" }}>
              <Plus className="h-4 w-4" style={{ color: "#a39e98" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(0,0,0,0.95)" }}>{t("grid.newLink")}</p>
            <p style={{ fontSize: 12, fontWeight: 400, color: "#a39e98", letterSpacing: "0.125px" }}>{t("grid.addPageForFeedback")}</p>
          </div>
        </div>
      )}

      {reviews.map(({ review, annotations, updatedAt, status }) => {
        const unseen = getUnseenCount(review.id, annotations.length);
        const effectiveStatus = status ?? "receiving";
        const pill = STATUS_PILL[effectiveStatus];
        return (
          <div key={review.id}>
            <div
              className="overflow-hidden cursor-pointer relative group transition-shadow"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 12,
                boxShadow: cardShadow,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = cardShadowHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = cardShadow; }}
              onClick={() => onSelect(review, annotations)}
            >
              {/* Image — top rounded 12px */}
              <div
                className="aspect-video relative overflow-hidden flex items-start justify-center"
                style={{ backgroundColor: "#f6f5f4", borderRadius: "12px 12px 0 0" }}
              >
                {review.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.image_url}
                    alt={review.title}
                    className="w-full h-full object-cover object-top"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.1)" }}
                  />
                )}
                {/* Unseen badge */}
                {unseen > 0 && (
                  <div
                    className="absolute top-2.5 left-2.5 flex items-center gap-1"
                    style={{
                      padding: "2px 8px",
                      borderRadius: 9999,
                      backgroundColor: "#f2f9ff",
                      color: "#097fe8",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.125px",
                    }}
                  >
                    <Bell className="h-2.5 w-2.5" />
                    {unseen}
                  </div>
                )}
                {/* Delete button */}
                {showDelete && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      borderRadius: 4,
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(review.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: "#615d59" }} />
                  </Button>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "12px 16px 14px" }}>
                {/* Author — Caption Light: 14px weight 400 */}
                {showAuthor && review.created_by && (
                  <p style={{ fontSize: 14, fontWeight: 400, color: "#a39e98", lineHeight: 1.43, marginBottom: 2 }}>
                    {review.created_by}
                  </p>
                )}

                {/* Title — Body Medium: 16px weight 500, near-black */}
                <p
                  className="truncate"
                  style={{ fontSize: 15, fontWeight: 600, color: "rgba(0,0,0,0.95)", lineHeight: 1.33 }}
                >
                  {review.title}
                </p>

                {/* Status + meta row */}
                <div className="flex items-center gap-2 min-w-0" style={{ marginTop: 10 }}>
                  {/* Pill Badge Button: per-status bg/text, 9999px radius, 12px weight 600 */}
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      padding: "3px 10px",
                      borderRadius: 9999,
                      backgroundColor: pill.bg,
                      color: pill.text,
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.125px",
                      lineHeight: 1.33,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className={effectiveStatus === "receiving" ? "animate-pulse" : ""}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: pill.dotColor,
                        flexShrink: 0,
                      }}
                    />
                    {t(pill.labelKey)}
                  </span>

                  {/* Micro Label: 12px weight 400 */}
                  <span
                    className="truncate"
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: "#a39e98",
                      letterSpacing: "0.125px",
                      marginLeft: "auto",
                      minWidth: 0,
                    }}
                  >
                    {annotations.length}{t("dashboard.feedbackCount")} · {formatDate(updatedAt, t)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string, t: (key: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("time.justNow");
  if (diffMin < 60) return t("time.minutesAgo").replace("{n}", String(diffMin));
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("time.hoursAgo").replace("{n}", String(diffHr));
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("time.daysAgo").replace("{n}", String(diffDay));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
