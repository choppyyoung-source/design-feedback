"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Zap, MessageCircle, Send } from "lucide-react";
import { getEmoji } from "@/lib/avatar";
import { getProfile, SPECIALTY_LABELS } from "@/lib/profiles";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    priceLabel: null,
    description: "피드백 요청만 보내기",
    icon: Send,
    features: [
      "피드백 요청 전송",
      "응답 보장 없음",
    ],
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: "$9",
    priceLabel: "$9",
    description: "핵심 피드백",
    icon: MessageCircle,
    features: [
      "피드백 5개",
      "48시간 내 응답",
    ],
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: "$19",
    priceLabel: "$19",
    description: "상세 피드백",
    icon: Zap,
    features: [
      "피드백 15개",
      "24시간 내 응답",
      "수정 제안 포함",
    ],
    popular: true,
  },
];

interface FeedbackRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designerEmail: string;
  currentUserEmail?: string;
}

export function FeedbackRequestModal({
  open,
  onOpenChange,
  designerEmail,
  currentUserEmail,
}: FeedbackRequestModalProps) {
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const profile = typeof window !== "undefined" ? getProfile(designerEmail) : null;

  const handleSubmit = async () => {
    if (selectedPlan === "free") {
      // Send email via mailto
      const designerName = profile?.name ?? designerEmail;
      const subject = encodeURIComponent(`[Design Feedback] ${currentUserEmail ?? "Someone"} is requesting your feedback`);
      const body = encodeURIComponent(
        `Hi ${designerName},\n\n${currentUserEmail ?? "A user"} would like to get your design feedback on their project.\n\nPlease check it out on Design Feedback.\n\nThanks!`
      );
      window.open(`mailto:${designerEmail}?subject=${subject}&body=${body}`, "_blank");
      setSent(true);
      return;
    }

    // Paid plans - Stripe checkout
    setIsLoading(true);
    // TODO: Stripe Checkout integration
    // const res = await fetch("/api/checkout", {
    //   method: "POST",
    //   body: JSON.stringify({ planId: selectedPlan, designerEmail }),
    // });
    // const { url } = await res.json();
    // window.location.href = url;
    setTimeout(() => {
      setIsLoading(false);
      alert("Stripe 결제 연동 준비 중입니다.");
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-[15px] font-bold">피드백 요청하기</DialogTitle>
        </DialogHeader>

        {/* Designer info */}
        {profile && (
          <div className="mx-5 mt-3 flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg flex-shrink-0 border border-border/40">
              {getEmoji(designerEmail)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">{profile.name}</p>
              <p className="text-[11px] text-primary/60 font-medium">{SPECIALTY_LABELS[profile.specialty]}</p>
            </div>
          </div>
        )}

        {/* Sent confirmation */}
        {sent && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-[15px] font-semibold mb-1">요청을 보냈어요</p>
            <p className="text-[12px] text-muted-foreground/50">디자이너가 확인하면 피드백을 시작할 거예요</p>
            <Button
              variant="ghost"
              className="mt-4 text-[12px]"
              onClick={() => { setSent(false); onOpenChange(false); }}
            >
              닫기
            </Button>
          </div>
        )}

        {!sent && (
          <>
            {/* Plans */}
            <div className="p-5 space-y-2">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const Icon = plan.icon;
                return (
                  <button
                    key={plan.id}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-foreground/20 bg-muted/20 ring-1 ring-foreground/10"
                        : "border-border/50 hover:border-border/80 hover:bg-muted/10"
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground/50"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold">{plan.name}</span>
                          {plan.popular && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-foreground text-background font-semibold uppercase tracking-wider">
                              popular
                            </span>
                          )}
                          <span className={`text-[15px] font-bold ml-auto ${plan.id === "free" ? "text-muted-foreground/40" : ""}`}>{plan.price}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">{plan.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                          {plan.features.map((f) => (
                            <span key={f} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
                              <Check className="h-2.5 w-2.5 text-foreground/40" />
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <div className="p-5 pt-0">
              <Button
                className="w-full h-11 bg-foreground hover:bg-foreground/90 text-background font-semibold"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? "처리 중..." : selectedPlan === "free" ? "요청 보내기" : `${PLANS.find((p) => p.id === selectedPlan)?.price}로 피드백 요청하기`}
              </Button>
              {selectedPlan !== "free" && (
                <p className="text-[11px] text-muted-foreground/40 text-center mt-2">
                  Stripe 안전 결제 · 만족하지 않으면 환불
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
