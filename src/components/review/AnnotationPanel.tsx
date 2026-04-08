"use client";

import { useState } from "react";
import { useReviewStore } from "@/lib/store/review-store";
import type { Annotation, AnnotationReply, AnnotationSeverity } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Trash2, MessageCircle, Send, Crown, X } from "lucide-react";
import { useT } from "@/lib/i18n";

const SEVERITY_STYLE: Record<
  AnnotationSeverity,
  { bg: string; text: string; dot: string }
> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

const SEVERITY_KEYS: Record<AnnotationSeverity, string> = {
  "must-fix": "severity.mustFix",
  "should-fix": "severity.shouldFix",
  suggestion: "severity.suggestion",
  praise: "severity.praise",
};

interface AnnotationPanelProps {
  onDelete: (id: string) => void;
  onLoginClick?: () => void;
  currentUserEmail?: string;
  ownerEmail?: string;
  onProfileClick?: (email: string) => void;
  projectDescription?: string;
  onDescriptionChange?: (desc: string) => void;
}

export function AnnotationPanel({
  onDelete,
  onLoginClick,
  currentUserEmail,
  ownerEmail,
  onProfileClick,
  projectDescription,
  onDescriptionChange,
}: AnnotationPanelProps) {
  const t = useT();
  const {
    pageAnnotations,
    activePageId,
    selectedAnnotationId,
    setSelectedAnnotationId,
    addReply,
    removeReply,
  } = useReviewStore();

  const annotations = activePageId
    ? pageAnnotations[activePageId] || []
    : [];

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(projectDescription ?? "");

  const isProjectOwner = !!currentUserEmail && currentUserEmail === ownerEmail;
  const canEditDesc = !!onDescriptionChange && isProjectOwner;

  const saveDesc = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onDescriptionChange?.(trimmed);
    setIsEditingDesc(false);
  };

  const descriptionBlock = (projectDescription && !isEditingDesc) ? (
    <div
      className={`rounded-md bg-[#f6f5f4] px-4 py-3 ${canEditDesc ? "cursor-pointer hover:bg-[#f6f5f4] transition-colors" : ""}`}
      onClick={() => {
        if (canEditDesc) {
          setDescDraft(projectDescription);
          setIsEditingDesc(true);
        }
      }}
    >
      <p className="text-[13px] font-semibold text-[#615d59] uppercase tracking-wider mb-1">{t("review.requestDescription")}</p>
      <p className="text-[13px] text-[rgba(0,0,0,0.95)] leading-relaxed whitespace-pre-wrap">{projectDescription}</p>
    </div>
  ) : (isEditingDesc || (!projectDescription && canEditDesc)) ? (
    <div>
      <textarea
        className="w-full min-h-[68px] rounded-md bg-[#f6f5f4] px-4 py-3 text-[13px] placeholder:text-[#a39e98] focus:outline-none focus:ring-1 focus:ring-ring resize-none transition-colors"
        placeholder={t("review.requestPlaceholder")}
        value={descDraft}
        onChange={(e) => setDescDraft(e.target.value)}
        onBlur={(e) => saveDesc(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            saveDesc((e.target as HTMLTextAreaElement).value);
          }
          if (e.key === "Escape") {
            setIsEditingDesc(false);
            setDescDraft(projectDescription ?? "");
          }
        }}
        autoFocus
      />
      <p className="text-[13px] text-[#a39e98] mt-1.5 px-1">{t("review.contextHelp")}</p>
    </div>
  ) : null;

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4">
          {descriptionBlock}
        </div>
        <div className="flex-1">
          <EmptyState onLoginClick={onLoginClick} isProjectOwner={!!currentUserEmail && currentUserEmail === ownerEmail} />
        </div>
      </div>
    );
  }

  // Split annotations into owner questions vs designer feedback
  const ownerQuestions = annotations.filter(
    (a) => ownerEmail && a.author_name === ownerEmail
  );
  const designerFeedback = annotations.filter(
    (a) => !ownerEmail || a.author_name !== ownerEmail
  );

  const renderItem = (annotation: Annotation) => {
    const index = annotations.indexOf(annotation);
    return (
      <AnnotationItem
        key={annotation.id}
        annotation={annotation}
        index={index}
        isSelected={selectedAnnotationId === annotation.id}
        onSelect={() =>
          setSelectedAnnotationId(
            selectedAnnotationId === annotation.id
              ? null
              : annotation.id
          )
        }
        onDelete={() => onDelete(annotation.id)}
        onReply={(text) => {
          const reply: AnnotationReply = {
            id: crypto.randomUUID(),
            annotation_id: annotation.id,
            comment: text,
            author_name: currentUserEmail || "Anonymous",
            created_at: new Date().toISOString(),
          };
          addReply(annotation.id, reply);
        }}
        onDeleteReply={(replyId) => removeReply(annotation.id, replyId)}
        currentUserEmail={currentUserEmail}
        ownerEmail={ownerEmail}
        onProfileClick={onProfileClick}
      />
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Description */}
        {descriptionBlock}

        {/* Owner questions */}
        {ownerQuestions.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Crown className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-sm font-semibold text-violet-500">{t("review.ownerQuestion")}</span>
              <span className="text-[13px] text-[#a39e98] ml-auto">{ownerQuestions.length}</span>
            </div>
            <div className="space-y-0.5">
              {ownerQuestions.map(renderItem)}
            </div>
          </section>
        )}

        {/* Designer feedback */}
        {designerFeedback.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-sm font-semibold text-blue-500">{t("review.designerFeedback")}</span>
              <span className="text-[13px] text-[#a39e98] ml-auto">{designerFeedback.length}</span>
            </div>
            <div className="space-y-0.5">
              {designerFeedback.map(renderItem)}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}

function AnnotationItem({
  annotation,
  index,
  isSelected,
  onSelect,
  onDelete,
  onReply,
  onDeleteReply,
  currentUserEmail,
  ownerEmail,
  onProfileClick,
}: {
  annotation: Annotation;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onReply: (text: string) => void;
  onDeleteReply: (replyId: string) => void;
  currentUserEmail?: string;
  ownerEmail?: string;
  onProfileClick?: (email: string) => void;
}) {
  const t = useT();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const style = SEVERITY_STYLE[annotation.severity];
  const isOwner = ownerEmail && annotation.author_name === ownerEmail;
  const isMe = currentUserEmail && annotation.author_name === currentUserEmail;
  const replies = annotation.replies || [];

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(replyText.trim());
    setReplyText("");
    setShowReplyInput(false);
  };

  return (
    <div
      className={`rounded-lg px-3 py-2.5 cursor-pointer transition-all group/item ${
        isSelected
          ? "bg-primary/5 ring-1 ring-primary/15"
          : "hover:bg-[#f6f5f4]"
      }`}
      onClick={onSelect}
    >
      {/* Content */}
      <div className="flex gap-2.5">
        <span className={`text-sm font-bold leading-[22px] w-4 text-center flex-shrink-0 ${isOwner ? "text-violet-400" : "text-[#a39e98]"}`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {/* Comment */}
          <p className="text-sm leading-[22px] text-[rgba(0,0,0,0.95)]">
            {annotation.comment}
          </p>

          {/* Attached images */}
          {annotation.image_urls && annotation.image_urls.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {annotation.image_urls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-16 h-16 object-cover rounded-md border border-[rgba(0,0,0,0.08)] cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxUrl(url);
                  }}
                />
              ))}
            </div>
          )}

          {/* Lightbox */}
          {lightboxUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setLightboxUrl(null)}
            >
              <div className="relative max-w-[90vw] max-h-[85vh]">
                <button
                  className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-[rgba(0,0,0,0.95)] hover:bg-[#f6f5f4] transition-colors z-10"
                  onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
                >
                  <X className="h-4 w-4" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxUrl}
                  alt=""
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <button
              className="text-[13px] text-[#a39e98] hover:text-primary transition-colors truncate max-w-[140px]"
              onClick={(e) => {
                e.stopPropagation();
                onProfileClick?.(annotation.author_name);
              }}
            >
              {annotation.author_name}
            </button>
            {isMe && (
              <span className="text-[11px] font-medium text-primary/50 whitespace-nowrap">{t("review.me")}</span>
            )}
            {!isOwner && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${style.bg} ${style.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                {t(SEVERITY_KEYS[annotation.severity])}
              </span>
            )}
            <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button
                className="h-5 w-5 flex items-center justify-center rounded text-[#a39e98] hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReplyInput(!showReplyInput);
                }}
              >
                <MessageCircle className="h-3 w-3" />
              </button>
              {isMe && (
                <button
                  className="h-5 w-5 flex items-center justify-center rounded text-[#a39e98] hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-2.5 space-y-1">
              {replies.map((reply) => {
                const replyIsOwner = ownerEmail && reply.author_name === ownerEmail;
                const replyIsMe = currentUserEmail && reply.author_name === currentUserEmail;
                return (
                  <div key={reply.id} className="group/reply flex gap-2 pl-1 py-1.5 rounded-md hover:bg-[#f6f5f4] transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#f6f5f4] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[13px]">↳</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[rgba(0,0,0,0.95)] leading-relaxed">{reply.comment}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[13px] text-[#a39e98]">{reply.author_name}</span>
                        {replyIsMe && <span className="text-[13px] text-primary/50 font-medium">{t("review.me")}</span>}
                        {replyIsOwner && <span className="text-[13px] text-violet-400 font-medium">{t("review.author")}</span>}
                        {replyIsMe && (
                          <button
                            className="ml-auto opacity-0 group-hover/reply:opacity-100 transition-opacity h-4 w-4 flex items-center justify-center rounded text-[#a39e98] hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteReply(reply.id);
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply input */}
          {showReplyInput && (
            <div
              className="flex items-center gap-1.5 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                placeholder={t("review.replyPlaceholder")}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitReply();
                }}
                className="h-7 text-xs bg-white border-[rgba(0,0,0,0.08)]"
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0 bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90"
                disabled={!replyText.trim()}
                onClick={handleSubmitReply}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onLoginClick, isProjectOwner }: { onLoginClick?: () => void; isProjectOwner?: boolean }) {
  const t = useT();
  const isLoggedIn =
    typeof window !== "undefined" &&
    (!!Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")) ||
     !!localStorage.getItem("dr_session"));

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
      <div className="w-12 h-12 rounded-md bg-[#f6f5f4] flex items-center justify-center mb-4">
        <MessageCircle className="h-5 w-5 text-[#a39e98]" />
      </div>
      {!isLoggedIn ? (
        <>
          <p className="text-sm font-medium mb-1">{t("review.emptyGetFeedback")}</p>
          <p className="text-[#a39e98] text-xs mb-5">
            {t("review.emptyLoginPrompt")}
          </p>
          {onLoginClick && (
            <Button size="sm" className="gap-1.5 bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90" onClick={onLoginClick}>
              {t("auth.login")}
            </Button>
          )}
        </>
      ) : isProjectOwner ? (
        <>
          <p className="text-sm font-medium mb-1">{t("review.emptyReceiving")}</p>
          <p className="text-[#a39e98] text-xs">
            {t("review.emptyReceivingDesc")}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium mb-1">{t("review.emptyNoFeedback")}</p>
          <p className="text-[#a39e98] text-xs">
            {t("review.emptyPinPrompt")}
          </p>
        </>
      )}
    </div>
  );
}
