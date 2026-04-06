"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageCircle, Bell } from "lucide-react";
import type { Annotation, Review } from "@/types";
import { getUnseenCount } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReviewItem = { review: Review; annotations: Annotation[]; updatedAt: string; [key: string]: any };

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
      <div className="space-y-5">
        {!hideNewButton && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onNew}>
            디자인 리뷰 받기
          </Button>
        </div>
      )}
        <Card className="p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">📋</span>
          </div>
          <p className="text-sm font-medium mb-1">{emptyMessage}</p>
          <p className="text-xs text-muted-foreground">{emptyDescription}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!hideNewButton && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onNew}>
            디자인 리뷰 받기
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.map(({ review, annotations, updatedAt }) => {
          const unseen = getUnseenCount(review.id, annotations.length);
          return (
            <Card
              key={review.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border-border/50 relative group"
              onClick={() => onSelect(review, annotations)}
            >
              <div className="aspect-video bg-muted/50 relative overflow-hidden">
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
                    className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(review.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="p-4">
                {showAuthor && review.created_by && (
                  <p className="text-[11px] text-muted-foreground mb-1">{review.created_by}</p>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate flex-1">{review.title}</p>
                  {unseen > 0 && (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    {annotations.length}개 코멘트
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDate(updatedAt)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
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
