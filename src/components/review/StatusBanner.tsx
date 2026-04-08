"use client";

import type { ProjectStatus } from "@/types";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

interface StatusBannerProps {
  status: ProjectStatus;
  appliedCount?: number;
  totalCount?: number;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { icon: typeof MessageCircle; labelKey: string; bg: string; text: string; border: string }
> = {
  receiving: {
    icon: MessageCircle,
    labelKey: "status.receiving",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  applying: {
    icon: Loader2,
    labelKey: "status.applying",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  completed: {
    icon: CheckCircle2,
    labelKey: "status.completed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

export function StatusBanner({ status, appliedCount, totalCount }: StatusBannerProps) {
  const t = useT();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "applying" ? "animate-spin" : ""}`} />
      <span>{t(config.labelKey)}</span>
      {status === "applying" && appliedCount != null && totalCount != null && (
        <span className="text-[13px] opacity-70">
          ({appliedCount}/{totalCount})
        </span>
      )}
    </div>
  );
}
