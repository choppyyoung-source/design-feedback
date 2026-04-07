"use client";

import { useState } from "react";
import { useReviewStore } from "@/lib/store/review-store";
import type { Annotation, AnnotationReply, AnnotationSeverity } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Trash2, MessageCircle, Send, Crown } from "lucide-react";

const SEVERITY_STYLE: Record<
  AnnotationSeverity,
  { bg: string; text: string; dot: string }
> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

const SEVERITY_LABEL_KO: Record<AnnotationSeverity, string> = {
  "must-fix": "필수 수정",
  "should-fix": "수정 권장",
  suggestion: "제안",
  praise: "좋아요",
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
  const {
    pageAnnotations,
    activePageId,
    selectedAnnotationId,
    setSelectedAnnotationId,
    addReply,
  } = useReviewStore();

  const annotations = activePageId
    ? pageAnnotations[activePageId] || []
    : [];

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(projectDescription ?? "");

  const canEditDesc = !!onDescriptionChange;

  const saveDesc = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) onDescriptionChange?.(trimmed);
    setIsEditingDesc(false);
  };

  const descriptionBlock = (projectDescription && !isEditingDesc) ? (
    <div
      className={`rounded-xl bg-muted/50 px-4 py-3 ${canEditDesc ? "cursor-pointer hover:bg-muted/70 transition-colors" : ""}`}
      onClick={() => {
        if (canEditDesc) {
          setDescDraft(projectDescription);
          setIsEditingDesc(true);
        }
      }}
    >
      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">요청사항</p>
      <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{projectDescription}</p>
    </div>
  ) : (isEditingDesc || (!projectDescription && canEditDesc)) ? (
    <div>
      <textarea
        className="w-full min-h-[68px] rounded-xl bg-muted/40 px-4 py-3 text-[13px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none transition-colors"
        placeholder="이 페이지에서 어떤 피드백을 원하세요?"
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
      <p className="text-[11px] text-muted-foreground/40 mt-1.5 px-1">맥락을 알수록 정확한 피드백을 줄 수 있어요</p>
    </div>
  ) : null;

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4">
          {descriptionBlock}
        </div>
        <div className="flex-1">
          <EmptyState onLoginClick={onLoginClick} />
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
              <span className="text-[12px] font-semibold text-violet-500">작성자 질문</span>
              <span className="text-[11px] text-muted-foreground/40 ml-auto">{ownerQuestions.length}</span>
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
              <span className="text-[12px] font-semibold text-blue-500">디자이너 피드백</span>
              <span className="text-[11px] text-muted-foreground/40 ml-auto">{designerFeedback.length}</span>
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
  currentUserEmail?: string;
  ownerEmail?: string;
  onProfileClick?: (email: string) => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
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
          : "hover:bg-muted/30"
      }`}
      onClick={onSelect}
    >
      {/* Content */}
      <div className="flex gap-2.5">
        <span className={`text-[12px] font-bold leading-[22px] w-4 text-center flex-shrink-0 ${isOwner ? "text-violet-400" : "text-muted-foreground/30"}`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {/* Comment */}
          <p className="text-sm leading-[22px] text-foreground/90">
            {annotation.comment}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mt-1">
            <button
              className="text-[12px] text-muted-foreground/40 hover:text-primary transition-colors truncate"
              onClick={(e) => {
                e.stopPropagation();
                onProfileClick?.(annotation.author_name);
              }}
            >
              {annotation.author_name}
            </button>
            {isMe && (
              <span className="text-[11px] font-medium text-primary/50">나</span>
            )}
            {!isOwner && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${style.text}/70`}>
                <span className={`w-1 h-1 rounded-full ${style.dot}/70`} />
                {SEVERITY_LABEL_KO[annotation.severity]}
              </span>
            )}
            <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReplyInput(!showReplyInput);
                }}
              >
                <MessageCircle className="h-3 w-3" />
              </button>
              <button
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-2 pl-2.5 border-l border-border/30 space-y-1.5">
              {replies.map((reply) => {
                const replyIsOwner = ownerEmail && reply.author_name === ownerEmail;
                const replyIsMe = currentUserEmail && reply.author_name === currentUserEmail;
                return (
                  <div key={reply.id}>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-foreground/40">
                        {reply.author_name}
                      </span>
                      {replyIsMe && <span className="text-[9px] text-primary/50 font-medium">나</span>}
                      {replyIsOwner && <span className="text-[9px] text-violet-400 font-medium">작성자</span>}
                    </div>
                    <p className="text-[12px] text-foreground/50 leading-relaxed">{reply.comment}</p>
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
                placeholder="답글 작성..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitReply();
                }}
                className="h-7 text-xs bg-white border-border/40"
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0 bg-foreground hover:bg-foreground/90"
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

function EmptyState({ onLoginClick }: { onLoginClick?: () => void }) {
  const isLoggedIn =
    typeof window !== "undefined" &&
    !!localStorage.getItem("dr_session");

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
      <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mb-4">
        <MessageCircle className="h-5 w-5 text-muted-foreground/30" />
      </div>
      <p className="text-sm font-medium mb-1">아직 피드백이 없어요</p>
      <p className="text-muted-foreground/50 text-xs mb-5">
        디자인에 핀을 찍어 피드백을 남겨보세요
      </p>
      {!isLoggedIn && onLoginClick && (
        <Button size="sm" className="gap-1.5 bg-foreground hover:bg-foreground/90" onClick={onLoginClick}>
          로그인
        </Button>
      )}
    </div>
  );
}
