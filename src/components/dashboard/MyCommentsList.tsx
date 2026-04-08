"use client";

import type { Annotation, ProjectStatus, Review } from "@/types";
import { MessageCircle } from "lucide-react";
import { ReviewGrid } from "./ReviewGrid";
import { useT } from "@/lib/i18n";

const STATUS_BADGE_KEY: Record<ProjectStatus, { labelKey: string; bg: string; text: string; dot: string }> = {
  receiving: { labelKey: "status.receiving", bg: "bg-blue-50 border border-blue-200/60", text: "text-blue-600", dot: "bg-blue-500 animate-pulse" },
  applying: { labelKey: "status.applyingShort", bg: "bg-amber-50 border border-amber-200/60", text: "text-amber-600", dot: "bg-amber-500" },
  completed: { labelKey: "status.completedAlt", bg: "bg-emerald-50 border border-emerald-200/60", text: "text-emerald-600", dot: "bg-emerald-500" },
};

const SEVERITY_STYLE_KEY: Record<string, { bg: string; text: string; dot: string; labelKey: string }> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", labelKey: "severity.mustFix" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", labelKey: "severity.shouldFix" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", labelKey: "severity.suggestion" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", labelKey: "severity.praise" },
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

export function MyCommentsList({ comments, onSelectProject, onExplore, publicProjects, onSelectPublicProject }: MyCommentsListProps) {
  const t = useT();
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
            className="rounded-md border border-[rgba(0,0,0,0.1)] bg-card overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            onClick={() => onSelectProject(projectId)}
          >
            {/* Project header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.08)] bg-[#f6f5f4]/50">
              <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {first.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={first.imageUrl}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#a39e98] text-xs">
                    📄
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold truncate">{first.projectName}</p>
                  <span className="text-sm text-[#a39e98] flex-shrink-0">{items.length}{t("comments.feedbackLeftCount")}</span>
                </div>
                {first.pageName && first.pageName !== first.projectName && (
                  <p className="text-sm text-[#615d59] truncate">{first.pageName}</p>
                )}
              </div>
              {(() => {
                const s = first.projectStatus ?? "receiving";
                const badge = STATUS_BADGE_KEY[s];
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[13px] font-medium flex-shrink-0 ${badge.bg} ${badge.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {t(badge.labelKey)}
                  </div>
                );
              })()}
            </div>

            {/* Comments */}
            <div className="divide-y divide-[rgba(0,0,0,0.06)]">
              {items.map((item) => {
                const isOwnerQuestion = item.ownerEmail && item.annotation.author_name === item.ownerEmail;
                const style = SEVERITY_STYLE_KEY[item.annotation.severity] ?? SEVERITY_STYLE_KEY.suggestion;
                return (
                  <div
                    key={item.annotation.id}
                    className="px-4 py-3 hover:bg-[#f6f5f4] transition-colors"
                  >
                    <p className="text-sm leading-relaxed text-[rgba(0,0,0,0.95)] mb-1.5">
                      {item.annotation.comment}
                    </p>
                    <div className="flex items-center gap-2">
                      {isOwnerQuestion ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium bg-violet-50 text-violet-600">
                          <span className="w-1 h-1 rounded-full bg-violet-500" />
                          {t("review.ownerQuestion")}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium ${style.bg} ${style.text}`}>
                          <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                          {t(style.labelKey)}
                        </span>
                      )}
                      <span className="text-[13px] text-[#a39e98] ml-auto">
                        {formatDate(item.annotation.created_at, t)}
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
          <div className="w-12 h-12 rounded-md bg-[#f6f5f4] flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="h-5 w-5 text-[#a39e98]" />
          </div>
          <p className="text-sm font-medium mb-0.5">{t("comments.noFeedbackYet")}</p>
          <p className="text-xs text-[#615d59]">{t("comments.exploreBelowProjects")}</p>
        </div>
      )}

      {/* Public projects needing feedback */}
      {publicProjects && publicProjects.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-[13px] font-semibold">{t("comments.projectsNeedingFeedback")}</span>
            <span className="text-[13px] text-[#a39e98]">{publicProjects.length}</span>
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
        <p className="text-xs text-[#a39e98] text-center">{t("comments.noProjectsNeedingFeedback")}</p>
      )}
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
