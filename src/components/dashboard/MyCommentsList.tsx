"use client";

import type { Annotation, ProjectStatus, Review } from "@/types";
import { MessageCircle } from "lucide-react";
import { ReviewGrid } from "./ReviewGrid";

const STATUS_BADGE_STYLE: Record<ProjectStatus, { label: string; bg: string; text: string; dot: string }> = {
  receiving: { label: "피드백 받는 중", bg: "bg-blue-50 border border-blue-200/60", text: "text-blue-600", dot: "bg-blue-500 animate-pulse" },
  applying: { label: "적용 중", bg: "bg-amber-50 border border-amber-200/60", text: "text-amber-600", dot: "bg-amber-500" },
  completed: { label: "반영 완료", bg: "bg-emerald-50 border border-emerald-200/60", text: "text-emerald-600", dot: "bg-emerald-500" },
};

interface CommentItem {
  annotation: Annotation;
  projectName: string;
  pageName: string;
  projectId: string;
  imageUrl?: string;
  ownerEmail?: string;
  projectStatus?: ProjectStatus;
}

interface PublicProjectItem {
  review: Review;
  annotations: Annotation[];
  updatedAt: string;
  status?: ProjectStatus;
}

interface MyCommentsListProps {
  comments: CommentItem[];
  onSelectProject: (projectId: string) => void;
  onExplore?: () => void;
  publicProjects?: PublicProjectItem[];
  onSelectPublicProject?: (r: Review) => void;
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", label: "필수 수정" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", label: "수정 권장" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", label: "제안" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", label: "좋아요" },
};

export function MyCommentsList({ comments, onSelectProject, onExplore, publicProjects, onSelectPublicProject }: MyCommentsListProps) {
  // Group by project
  const grouped = comments.reduce<Record<string, CommentItem[]>>((acc, item) => {
    if (!acc[item.projectId]) acc[item.projectId] = [];
    acc[item.projectId].push(item);
    return acc;
  }, {});

  const hasComments = comments.length > 0;

  return (
    <div className="space-y-6">
      {/* My comments section */}
      {hasComments ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([projectId, items]) => {
        const first = items[0];
        return (
          <div
            key={projectId}
            className="rounded-2xl border border-border/70 bg-card overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            onClick={() => onSelectProject(projectId)}
          >
            {/* Project header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/10">
              <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {first.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={first.imageUrl}
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
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold truncate">{first.projectName}</p>
                  <span className="text-[12px] text-muted-foreground/50 flex-shrink-0">{items.length}개의 피드백을 남겼어요</span>
                </div>
                {first.pageName && first.pageName !== first.projectName && (
                  <p className="text-[12px] text-muted-foreground truncate">{first.pageName}</p>
                )}
              </div>
              {(() => {
                const s = first.projectStatus ?? "receiving";
                const badge = STATUS_BADGE_STYLE[s];
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${badge.bg} ${badge.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </div>
                );
              })()}
            </div>

            {/* Comments */}
            <div className="divide-y divide-border/20">
              {items.map((item) => {
                const isOwnerQuestion = item.ownerEmail && item.annotation.author_name === item.ownerEmail;
                const style = SEVERITY_STYLE[item.annotation.severity] ?? SEVERITY_STYLE.suggestion;
                return (
                  <div
                    key={item.annotation.id}
                    className="px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <p className="text-sm leading-relaxed text-foreground/90 mb-1.5">
                      {item.annotation.comment}
                    </p>
                    <div className="flex items-center gap-2">
                      {isOwnerQuestion ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 text-violet-600">
                          <span className="w-1 h-1 rounded-full bg-violet-500" />
                          작성자 질문
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
                          <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground/40 ml-auto">
                        {formatDate(item.annotation.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium mb-0.5">아직 남긴 피드백이 없어요</p>
          <p className="text-xs text-muted-foreground/60">아래 프로젝트에 피드백을 남겨보세요</p>
        </div>
      )}

      {/* Public projects needing feedback */}
      {publicProjects && publicProjects.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-[13px] font-semibold">피드백이 필요한 프로젝트</span>
            <span className="text-[11px] text-muted-foreground/40">{publicProjects.length}</span>
          </div>
          <ReviewGrid
            reviews={publicProjects}
            onSelect={(r) => onSelectPublicProject?.(r)}
            onDelete={() => {}}
            onNew={() => {}}
            emptyMessage=""
            emptyDescription=""
            showDelete={false}
            hideNewButton
            showAuthor
          />
        </section>
      )}

      {(!publicProjects || publicProjects.length === 0) && !hasComments && (
        <p className="text-xs text-muted-foreground/50 text-center">아직 피드백이 필요한 프로젝트가 없어요</p>
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
