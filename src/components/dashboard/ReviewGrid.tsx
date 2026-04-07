"use client";


import { Button } from "@/components/ui/button";
import { Trash2, Bell, Plus } from "lucide-react";
import type { Annotation, ProjectStatus, Review } from "@/types";
import { getUnseenCount } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReviewItem = { review: Review; annotations: Annotation[]; updatedAt: string; status?: ProjectStatus; [key: string]: any };

const STATUS_BADGE: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string }> = {
  receiving: { label: "피드백 받는 중", bg: "bg-blue-50 border border-blue-200/60", text: "text-blue-600", dot: "bg-blue-500 animate-pulse" },
  applying: { label: "적용 중", bg: "bg-amber-50 border border-amber-200/60", text: "text-amber-600", dot: "bg-amber-500" },
  completed: { label: "완료", bg: "bg-emerald-50 border border-emerald-200/60", text: "text-emerald-600", dot: "bg-emerald-500" },
};

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
  if (reviews.length === 0) {
    return (
      <div>
        {!hideNewButton && (
          <div
            className="relative cursor-pointer group/new rounded-2xl"
            onClick={onNew}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
              <rect
                className="dash-border"
                x="1" y="1"
                rx="16"
                strokeWidth="1"
                strokeDasharray="5 4"
                style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
              />
            </svg>
            <div className="p-14 text-center bg-card rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Plus className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold mb-0.5">새 링크 올리기</p>
              <p className="text-xs text-muted-foreground/60">디자인 리뷰를 받아보세요</p>
            </div>
          </div>
        )}
        {hideNewButton && (
          <div>
            <div className="p-14 text-center bg-card border border-border/70 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg">📋</span>
              </div>
              <p className="text-sm font-medium mb-0.5">{emptyMessage}</p>
              <p className="text-xs text-muted-foreground/60">{emptyDescription}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {/* New link card */}
      {!hideNewButton && (
        <div
          className="h-full relative cursor-pointer group/new rounded-2xl"
          onClick={onNew}
        >
          {/* Animated dashed border via SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
            <rect
              className="dash-border"
              x="1" y="1"
              rx="16"
              strokeWidth="1"
              strokeDasharray="5 4"
              style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
            />
          </svg>
          <div className="h-full bg-card rounded-2xl flex flex-col items-center justify-center gap-1.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center mb-0.5">
              <Plus className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold">새 링크 올리기</p>
            <p className="text-[11px] text-muted-foreground/50">피드백 받을 페이지를 추가하세요</p>
          </div>
        </div>
      )}
      {reviews.map(({ review, annotations, updatedAt, status }) => {
        const unseen = getUnseenCount(review.id, annotations.length);
        const effectiveStatus = status ?? "receiving";
        const statusInfo = STATUS_BADGE[effectiveStatus];
        return (
          <div key={review.id}>
            <div
              className="overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border border-border/70 relative group bg-card rounded-2xl"
              onClick={() => onSelect(review, annotations)}
            >
              {/* Image */}
              <div className="aspect-video bg-muted/30 relative overflow-hidden flex items-start justify-center">
                {review.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.image_url}
                    alt={review.title}
                    className="w-full h-full object-cover object-top"
                  />
                )}
                {unseen > 0 && (
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
                    <Bell className="h-2.5 w-2.5" />
                    {unseen}
                  </div>
                )}
                {showDelete && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(review.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="px-4 py-3">
                {showAuthor && review.created_by && (
                  <p className="text-[12px] text-muted-foreground/50 mb-0.5">{review.created_by}</p>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold truncate flex-1">{review.title}</p>
                  {unseen > 0 && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </div>
                  <span className="text-[11px] text-muted-foreground/40 ml-auto">
                    {annotations.length}개 피드백 · {formatDate(updatedAt)}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
