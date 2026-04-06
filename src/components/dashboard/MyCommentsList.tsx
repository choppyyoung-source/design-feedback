"use client";

import { Card } from "@/components/ui/card";
import type { Annotation, Review } from "@/types";

interface CommentItem {
  annotation: Annotation;
  projectName: string;
  pageName: string;
  projectId: string;
  imageUrl?: string;
}

interface MyCommentsListProps {
  comments: CommentItem[];
  onSelectProject: (projectId: string) => void;
  onExplore?: () => void;
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", label: "필수 수정" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", label: "수정 권장" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", label: "제안" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", label: "좋아요" },
};

export function MyCommentsList({ comments, onSelectProject, onExplore }: MyCommentsListProps) {
  if (comments.length === 0) {
    return (
      <Card className="p-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
          <span className="text-xl">💬</span>
        </div>
        <p className="text-sm font-medium mb-1">아직 남긴 피드백이 없어요</p>
        <p className="text-xs text-muted-foreground">프로젝트에 코멘트를 남겨보세요</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Explore banner */}
      {onExplore && (
        <button
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15 hover:border-primary/30 transition-colors text-left"
          onClick={onExplore}
        >
          <span className="text-xl">🔍</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">피드백이 필요한 프로젝트 보러가기</p>
            <p className="text-xs text-muted-foreground">다른 사람의 프로젝트에 피드백을 남겨보세요</p>
          </div>
          <span className="text-muted-foreground text-sm">→</span>
        </button>
      )}

      {/* Comment list */}
      {comments.map((item) => {
        const style = SEVERITY_STYLE[item.annotation.severity] ?? SEVERITY_STYLE.suggestion;
        return (
          <Card
            key={item.annotation.id}
            className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-border/50"
            onClick={() => onSelectProject(item.projectId)}
          >
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              <div className="w-14 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs">
                    📄
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{item.annotation.comment}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                    <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.projectName}
                  </span>
                  {item.pageName && item.pageName !== item.projectName && (
                    <>
                      <span className="text-[11px] text-muted-foreground/40">/</span>
                      <span className="text-[11px] text-muted-foreground">{item.pageName}</span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground/40">
                    {formatDate(item.annotation.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
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
