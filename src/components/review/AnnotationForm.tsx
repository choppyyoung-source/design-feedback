"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import type { AnnotationCategory, AnnotationSeverity } from "@/types";

const SEVERITY_OPTIONS: { value: AnnotationSeverity; label: string; color: string }[] = [
  { value: "must-fix", label: "필수 수정", color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" },
  { value: "should-fix", label: "수정 권장", color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200" },
  { value: "suggestion", label: "제안", color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" },
  { value: "praise", label: "좋아요", color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200" },
];

interface AnnotationFormProps {
  onSubmit: (data: {
    comment: string;
    category: AnnotationCategory;
    severity: AnnotationSeverity;
    areaLabel: string;
    changeSpec: null;
    authorName: string;
  }) => void;
  onCancel: () => void;
  defaultAreaLabel?: string;
}

export function AnnotationForm({ onSubmit, onCancel, defaultAreaLabel }: AnnotationFormProps) {
  const [comment, setComment] = useState("");
  const [severity, setSeverity] = useState<AnnotationSeverity>("suggestion");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmit({
      comment: comment.trim(),
      category: "other",
      severity,
      areaLabel: defaultAreaLabel ?? "",
      changeSpec: null,
      authorName: "Anonymous",
    });
  };

  return (
    <Card className="p-5 shadow-2xl w-[340px] border-border/60 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">코멘트 추가</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Severity tags */}
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                severity === opt.value
                  ? `${opt.color} ring-1 ring-offset-1 ring-current`
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
              onClick={() => setSeverity(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Comment */}
        <Textarea
          placeholder="어떤 점이 문제인지, 어떻게 바꾸면 좋을지 적어주세요"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="text-sm min-h-[100px] resize-none"
          autoFocus
        />

        {/* Submit */}
        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={!comment.trim()}
        >
          저장
        </Button>
      </form>
    </Card>
  );
}
