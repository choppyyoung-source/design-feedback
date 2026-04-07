"use client";

import type { ProjectStatus } from "@/types";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";

interface StatusBannerProps {
  status: ProjectStatus;
  appliedCount?: number;
  totalCount?: number;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { icon: typeof MessageCircle; label: string; bg: string; text: string; border: string }
> = {
  receiving: {
    icon: MessageCircle,
    label: "피드백 받는 중",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  applying: {
    icon: Loader2,
    label: "피드백 적용 중",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  completed: {
    icon: CheckCircle2,
    label: "업데이트 완료",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

export function StatusBanner({ status, appliedCount, totalCount }: StatusBannerProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "applying" ? "animate-spin" : ""}`} />
      <span>{config.label}</span>
      {status === "applying" && appliedCount != null && totalCount != null && (
        <span className="text-[10px] opacity-70">
          ({appliedCount}/{totalCount})
        </span>
      )}
    </div>
  );
}
