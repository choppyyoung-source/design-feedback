"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Zap, MessageCircle, Send, AlertCircle } from "lucide-react";
import { getEmoji } from "@/lib/avatar";
import { getProfile, SPECIALTY_LABELS } from "@/lib/profiles";
import { useT } from "@/lib/i18n";

interface PlanDef {
  id: string;
  name: string;
  price: string;
  priceLabel: string | null;
  descriptionKey: string;
  icon: typeof Send;
  featureKeys: string[];
  popular: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    priceLabel: null,
    descriptionKey: "payment.freeDesc",
    icon: Send,
    featureKeys: ["payment.freeFeat1", "payment.freeFeat2"],
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    price: "$9",
    priceLabel: "$9",
    descriptionKey: "payment.basicDesc",
    icon: MessageCircle,
    featureKeys: ["payment.basicFeat1", "payment.basicFeat2"],
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: "$19",
    priceLabel: "$19",
    descriptionKey: "payment.standardDesc",
    icon: Zap,
    featureKeys: ["payment.standardFeat1", "payment.standardFeat2", "payment.standardFeat3"],
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
  const t = useT();
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>>>(null);

  useEffect(() => {
    if (open && designerEmail) getProfile(designerEmail).then(setProfile);
  }, [open, designerEmail]);

  const designerHasPayout = !!profile?.payoutMethod && (!!profile?.paypalEmail || !!profile?.bankInfo);

  const handleSubmit = async () => {
    if (selectedPlan === "free") {
      // Send email via mailto
      const designerName = profile?.name ?? designerEmail;
      const subject = encodeURIComponent(
        `[Design Feedback] ${currentUserEmail ?? "Someone"} is requesting your feedback`
      );
      const body = encodeURIComponent(
        `Hi ${designerName},\n\n${currentUserEmail ?? "A user"} would like to get your design feedback on their project.\n\nPlease check it out on Design Feedback.\n\nThanks!`
      );
      window.open(
        `mailto:${designerEmail}?subject=${subject}&body=${body}`,
        "_blank"
      );
      setSent(true);
      return;
    }

    // Paid plans — LemonSqueezy checkout
    if (!designerHasPayout) {
      return; // Should not happen due to UI guard
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/lemonsqueezy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          designerEmail,
          customerEmail: currentUserEmail,
          returnUrl: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || t("payment.checkoutError"));
        setIsLoading(false);
      }
    } catch {
      alert(t("payment.paymentError"));
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 rounded-md overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-[15px] font-bold">
            {t("payment.requestFeedback")}
          </DialogTitle>
        </DialogHeader>

        {/* Designer info */}
        {profile && (
          <div className="mx-5 mt-3 flex items-center gap-3 p-3 rounded-md bg-[#f6f5f4]">
            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-lg flex-shrink-0 border border-[rgba(0,0,0,0.08)]">
              {getEmoji(designerEmail)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">{profile.name}</p>
              <p className="text-[13px] text-primary/60 font-medium">
                {SPECIALTY_LABELS[profile.specialty]}
              </p>
            </div>
            {designerHasPayout && (
              <span className="ml-auto text-[13px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                {t("payment.paymentAvailable")}
              </span>
            )}
          </div>
        )}

        {/* Sent confirmation */}
        {sent && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-md bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-[15px] font-semibold mb-1">{t("payment.sent")}</p>
            <p className="text-sm text-[#a39e98]">
              {t("payment.sentDesc")}
            </p>
            <Button
              variant="ghost"
              className="mt-4 text-sm"
              onClick={() => {
                setSent(false);
                onOpenChange(false);
              }}
            >
              {t("payment.close")}
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
                const isPaid = plan.id !== "free";
                const disabled = isPaid && !designerHasPayout;

                return (
                  <button
                    key={plan.id}
                    className={`w-full text-left p-4 rounded-md border transition-all ${
                      disabled
                        ? "border-[rgba(0,0,0,0.08)] opacity-50 cursor-not-allowed"
                        : isSelected
                          ? "border-foreground/20 bg-[#f6f5f4] ring-1 ring-foreground/10"
                          : "border-[rgba(0,0,0,0.1)] hover:border-[rgba(0,0,0,0.1)] hover:bg-[#f6f5f4]/50"
                    }`}
                    onClick={() => !disabled && setSelectedPlan(plan.id)}
                    disabled={disabled}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-[rgba(0,0,0,0.95)] text-background"
                            : "bg-[#f6f5f4] text-[#a39e98]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold">
                            {plan.name}
                          </span>
                          {plan.popular && (
                            <span className="text-[13px] px-1.5 py-0.5 rounded-full bg-[rgba(0,0,0,0.95)] text-background font-semibold uppercase tracking-wider">
                              popular
                            </span>
                          )}
                          <span
                            className={`text-[15px] font-bold ml-auto ${plan.id === "free" ? "text-[#a39e98]" : ""}`}
                          >
                            {plan.price}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#a39e98] mt-0.5">
                          {t(plan.descriptionKey)}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                          {plan.featureKeys.map((fKey) => (
                            <span
                              key={fKey}
                              className="inline-flex items-center gap-1 text-[13px] text-[#615d59]"
                            >
                              <Check className="h-2.5 w-2.5 text-[#a39e98]" />
                              {t(fKey)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stripe not connected notice */}
            {!designerHasPayout && (
              <div className="mx-5 mb-2 flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-[13px]">
                  {t("payment.stripeNotConnected")}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="p-5 pt-0">
              <Button
                className="w-full h-11 bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90 text-background font-semibold"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading
                  ? t("payment.processing")
                  : selectedPlan === "free"
                    ? t("payment.sendRequest")
                    : t("payment.requestWithPrice").replace("{price}", PLANS.find((p) => p.id === selectedPlan)?.price ?? "")}
              </Button>
              {selectedPlan !== "free" && designerHasPayout && (
                <p className="text-[13px] text-[#a39e98] text-center mt-2">
                  {t("payment.stripeSecure")}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
