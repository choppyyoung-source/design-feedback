"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ImagePlus, Loader2 } from "lucide-react";
import type { AnnotationCategory, AnnotationSeverity } from "@/types";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

const SEVERITY_OPTIONS: { value: AnnotationSeverity; key: string; dot: string; activeBg: string; activeText: string }[] = [
  { value: "must-fix", key: "severity.mustFix", dot: "bg-red-500", activeBg: "bg-red-50", activeText: "text-red-700" },
  { value: "should-fix", key: "severity.shouldFix", dot: "bg-amber-500", activeBg: "bg-amber-50", activeText: "text-amber-700" },
  { value: "suggestion", key: "severity.suggestion", dot: "bg-blue-500", activeBg: "bg-blue-50", activeText: "text-blue-700" },
  { value: "praise", key: "severity.praise", dot: "bg-emerald-500", activeBg: "bg-emerald-50", activeText: "text-emerald-700" },
];

interface AnnotationFormProps {
  onSubmit: (data: {
    comment: string;
    category: AnnotationCategory;
    severity: AnnotationSeverity;
    areaLabel: string;
    changeSpec: null;
    authorName: string;
    imageUrls: string[];
  }) => void;
  onCancel: () => void;
  defaultAreaLabel?: string;
  isOwner?: boolean;
}

/** Convert file to data URL (fallback when Supabase Storage is unavailable) */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AnnotationForm({ onSubmit, onCancel, defaultAreaLabel, isOwner }: AnnotationFormProps) {
  const t = useT();
  const [comment, setComment] = useState("");
  const [severity, setSeverity] = useState<AnnotationSeverity>(isOwner ? "should-fix" : "suggestion");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      let url: string | null = null;

      // Try Supabase Storage first
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const ext = file.name.split(".").pop();
          const path = `feedback/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from("feedback-images").upload(path, file);
          if (!error) {
            const { data } = supabase.storage.from("feedback-images").getPublicUrl(path);
            url = data.publicUrl;
          }
        } catch {
          // Fall through to data URL
        }
      }

      // Fallback: data URL
      if (!url) {
        try {
          url = await fileToDataUrl(file);
        } catch {
          // Skip this file
        }
      }

      if (url) {
        setImageUrls((prev) => [...prev, url!]);
      }
    }

    setUploading(false);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmit({
      comment: comment.trim(),
      category: "other",
      severity: isOwner ? "should-fix" : severity,
      areaLabel: defaultAreaLabel ?? "",
      changeSpec: null,
      authorName: "Anonymous",
      imageUrls,
    });
  };

  // ── Owner: simplified question form ──
  if (isOwner) {
    return (
      <div className="p-4 w-[300px] rounded-lg bg-white border border-[rgba(0,0,0,0.1)] shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_8px,rgba(0,0,0,0.02)_0px_1px_3px]">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">{t("review.curiousAbout")}</h3>
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#f6f5f4] transition-colors"
              onClick={onCancel}
            >
              <X className="h-3.5 w-3.5 text-[#a39e98]" />
            </button>
          </div>
          <Textarea
            placeholder={t("review.curiousPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-[13px] min-h-[72px] resize-none bg-white border-[rgba(0,0,0,0.1)] focus-visible:ring-[#097fe8]"
            autoFocus
          />
          <button
            type="submit"
            className="w-full h-8 rounded-md bg-[rgba(0,0,0,0.95)] text-white text-[13px] font-medium hover:bg-[rgba(0,0,0,0.85)] transition-colors disabled:opacity-40"
            disabled={!comment.trim()}
          >
            {t("review.submitQuestion")}
          </button>
        </form>
      </div>
    );
  }

  // ── Reviewer: full feedback form ──
  return (
    <div className="p-5 w-[340px] rounded-lg bg-white border border-[rgba(0,0,0,0.1)] shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_8px,rgba(0,0,0,0.02)_0px_1px_3px]">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[rgba(0,0,0,0.95)]">{t("review.addFeedback")}</h3>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f6f5f4] transition-colors"
            onClick={onCancel}
          >
            <X className="h-4 w-4 text-[#a39e98]" />
          </button>
        </div>

        {/* Severity tags — Notion pill style */}
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTIONS.map((opt) => {
            const isActive = severity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium transition-all ${
                  isActive
                    ? `${opt.activeBg} ${opt.activeText} ring-1 ring-current/20`
                    : "bg-[#f6f5f4] text-[#615d59] hover:bg-[#eeedec]"
                }`}
                onClick={() => setSeverity(opt.value)}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? opt.dot : "bg-[#a39e98]"}`} />
                {t(opt.key)}
              </button>
            );
          })}
        </div>

        {/* Comment */}
        <Textarea
          placeholder={t("review.feedbackPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="text-[13px] min-h-[100px] resize-none bg-white border-[rgba(0,0,0,0.1)] focus-visible:ring-[#097fe8] placeholder:text-[#a39e98]"
          autoFocus
        />

        {/* Image thumbnails */}
        {imageUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="w-16 h-16 object-cover rounded-md border border-[rgba(0,0,0,0.08)]"
                />
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[rgba(0,0,0,0.95)] text-white rounded-full text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image upload button */}
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium text-[#615d59] hover:bg-[#f6f5f4] cursor-pointer transition-colors border border-dashed border-[rgba(0,0,0,0.15)]">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {uploading ? t("review.uploading") : t("review.attachImage")}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="w-full h-9 rounded-md bg-[#0075de] text-white text-[13px] font-semibold hover:bg-[#005bab] transition-colors disabled:opacity-40"
          disabled={!comment.trim() || uploading}
        >
          {t("review.save")}
        </button>
      </form>
    </div>
  );
}
