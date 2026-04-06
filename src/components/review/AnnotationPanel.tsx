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
  "should-fix": {
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500" },
  praise: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  },
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
}

export function AnnotationPanel({
  onDelete,
  onLoginClick,
  currentUserEmail,
  ownerEmail,
  onProfileClick,
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

  if (annotations.length === 0) {
    return <EmptyState onLoginClick={onLoginClick} />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {annotations.map((annotation, index) => (
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
        ))}
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
      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
        isSelected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-transparent hover:bg-muted/40"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Pin number */}
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-foreground/10 text-foreground/60">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          {/* Header: severity + owner badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}
            >
              <span className={`w-1 h-1 rounded-full ${style.dot}`} />
              {SEVERITY_LABEL_KO[annotation.severity]}
            </span>
            {isMe && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                나
              </span>
            )}
            {isOwner && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">
                <Crown className="h-2.5 w-2.5" />
                작성자
              </span>
            )}
          </div>

          {/* Comment */}
          <p className="text-[13px] leading-relaxed">
            {annotation.comment}
          </p>

          {/* Author + actions */}
          <div className="flex items-center justify-between mt-2">
            <button
              className="text-[11px] text-muted-foreground/60 hover:text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onProfileClick?.(annotation.author_name);
              }}
            >
              {annotation.author_name}
            </button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-muted-foreground/40 hover:text-foreground rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReplyInput(!showReplyInput);
                }}
              >
                <MessageCircle className="h-3 w-3 mr-0.5" />
                <span className="text-[10px]">
                  {replies.length > 0 ? replies.length : ""}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-destructive rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-2.5 pl-3 border-l-2 border-border/40 space-y-2">
              {replies.map((reply) => {
                const replyIsOwner =
                  ownerEmail && reply.author_name === ownerEmail;
                const replyIsMe =
                  currentUserEmail && reply.author_name === currentUserEmail;
                return (
                  <div key={reply.id} className="text-[12px]">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-medium text-foreground/70">
                        {reply.author_name}
                      </span>
                      {replyIsMe && (
                        <span className="text-[9px] text-primary font-medium">
                          나
                        </span>
                      )}
                      {replyIsOwner && (
                        <span className="text-[9px] text-amber-600 font-medium">
                          작성자
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/60">{reply.comment}</p>
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
                className="h-7 text-xs"
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0"
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
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <span className="text-xl">💬</span>
      </div>
      <p className="text-sm font-medium mb-1">아직 코멘트가 없어요</p>
      <p className="text-muted-foreground/60 text-xs mb-5">
        {isLoggedIn
          ? "디자이너에게 코멘트를 요청해보세요"
          : "로그인 후 디자이너에게 코멘트를 요청해보세요"}
      </p>
      {!isLoggedIn && onLoginClick && (
        <Button size="sm" className="gap-1.5" onClick={onLoginClick}>
          로그인하기
        </Button>
      )}
    </div>
  );
}
