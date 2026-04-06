"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Send, MessageCircle, PenLine, Bell } from "lucide-react";
import type { Annotation, Review } from "@/types";
import { getUnseenCount } from "@/lib/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReviewItem = { review: Review; annotations: Annotation[]; updatedAt: string; [key: string]: any };

interface ReviewGridProps {
  myReviews: ReviewItem[];
  commentedReviews: ReviewItem[];
  onSelect: (review: Review, annotations: Annotation[]) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function ReviewGrid({
  myReviews,
  commentedReviews,
  onSelect,
  onDelete,
  onNew,
}: ReviewGridProps) {
  const [tab, setTab] = useState<"requested" | "commented">("requested");
  const reviews = tab === "requested" ? myReviews : commentedReviews;

  return (
    <div className="space-y-6">
      {/* Tabs + Action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "requested"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("requested")}
          >
            <span className="flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" />
              요청한 리뷰
              {myReviews.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {myReviews.length}
                </span>
              )}
            </span>
          </button>
          <button
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "commented"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("commented")}
          >
            <span className="flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5" />
              참여한 리뷰
              {commentedReviews.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {commentedReviews.length}
                </span>
              )}
            </span>
          </button>
        </div>

        <Button size="sm" onClick={onNew} className="gap-1.5">
          디자인 리뷰 받기
        </Button>
      </div>

      {/* Grid */}
      {reviews.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <p className="text-muted-foreground text-sm">
            {tab === "requested"
              ? "아직 요청한 리뷰가 없어요"
              : "아직 참여한 리뷰가 없어요"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map(({ review, annotations, updatedAt }) => {
            const unseen = getUnseenCount(review.id, annotations.length);
            return (
            <Card
              key={review.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-all group border-border/60 relative"
              onClick={() => onSelect(review, annotations)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={review.image_url}
                  alt={review.title}
                  className="w-full h-full object-cover object-top"
                />
                {tab === "requested" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(review.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Unseen badge */}
              {unseen > 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
                  <Bell className="h-2.5 w-2.5" />
                  {unseen}
                </div>
              )}

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate flex-1">{review.title}</p>
                  {unseen > 0 && (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
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
      )}
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
