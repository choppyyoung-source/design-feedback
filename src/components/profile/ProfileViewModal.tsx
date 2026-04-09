"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Star, MessageCircle, CheckCircle2, FolderOpen } from "lucide-react";
import { type UserProfile, getProfile, addRating, SPECIALTY_KEYS } from "@/lib/profiles";
import { getEmoji } from "@/lib/avatar";
import { useT } from "@/lib/i18n";
import { sanitizeLinkHref } from "@/lib/security/url";

interface ContributionInfo {
  totalComments: number;
  appliedComments: number;
  projectCount: number;
}

interface ProfileViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  currentUserEmail?: string;
  contribution?: ContributionInfo;
  /** When true, the rating input opens immediately on modal open (used by "Rate" shortcut). */
  autoShowRating?: boolean;
}

export function ProfileViewModal({
  open,
  onOpenChange,
  email,
  currentUserEmail,
  contribution,
  autoShowRating = false,
}: ProfileViewModalProps) {
  const t = useT();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (open && email) getProfile(email).then(setProfile);
  }, [open, email]);

  // Sync auto-open-rating flag when modal opens or flag changes
  useEffect(() => {
    if (open && autoShowRating && currentUserEmail && currentUserEmail !== email) {
      setShowRating(true);
    }
  }, [open, autoShowRating, currentUserEmail, email]);

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-sm p-0 gap-0 overflow-hidden"
          style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center text-3xl" style={{ borderRadius: 12, backgroundColor: "#f6f5f4" }}>
              {getEmoji(email)}
            </div>
            <p style={{ fontSize: 14, fontWeight: 400, color: "#a39e98" }}>{email}</p>
            <p style={{ fontSize: 14, fontWeight: 400, color: "#615d59", marginTop: 8 }}>
              {t("profile.notRegistered")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const avgRating =
    profile.ratings.length > 0
      ? profile.ratings.reduce((sum, r) => sum + r.score, 0) /
        profile.ratings.length
      : null;

  const canRate = currentUserEmail && currentUserEmail !== email;

  const handleSubmitRating = async () => {
    if (!currentUserEmail || !ratingComment.trim()) return;
    await addRating(email, currentUserEmail, ratingScore, ratingComment.trim());
    const updated = await getProfile(email);
    setProfile(updated);
    setRatingComment("");
    setShowRating(false);
  };

  const stats = [
    { label: t("profile.totalFeedback"), value: contribution?.totalComments ?? 0, icon: MessageCircle },
    { label: t("profile.adopted"), value: contribution?.appliedComments ?? 0, icon: CheckCircle2 },
    { label: t("profile.participatedProjects"), value: contribution?.projectCount ?? 0, icon: FolderOpen },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0 overflow-hidden"
        style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)" }}
      >
        {/* Header with gradient banner */}
        <div className="relative">
          <div className="h-16" style={{ background: "linear-gradient(135deg, rgba(0,117,222,0.08), rgba(0,117,222,0.02), transparent)" }} />
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-6">
            <div
              className="w-14 h-14 flex items-center justify-center text-3xl bg-white"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "rgba(0,0,0,0.04) 0px 2px 8px",
              }}
            >
              {getEmoji(email)}
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="px-6 pt-10 pb-2 text-center">
          {/* Name — Nav/Button: 15px weight 600 */}
          <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(0,0,0,0.95)", lineHeight: 1.33 }}>
            {profile.name}
          </p>

          {/* Specialty — Pill Badge */}
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 9999,
                backgroundColor: "#f2f9ff",
                color: "#097fe8",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.125px",
              }}
            >
              {t(SPECIALTY_KEYS[profile.specialty])}
            </span>
            {avgRating !== null && (
              <span className="flex items-center gap-1" style={{ fontSize: 13, color: "#615d59" }}>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)}
                <span style={{ color: "#a39e98" }}>({profile.ratings.length})</span>
              </span>
            )}
          </div>

          {/* Email — Caption Light */}
          <p style={{ fontSize: 13, fontWeight: 400, color: "#a39e98", marginTop: 6 }}>{email}</p>
        </div>

        {/* Contribution stats */}
        {contribution && contribution.totalComments > 0 && (
          <div className="px-6 pb-1">
            <div className="grid grid-cols-3 gap-2 mt-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center py-2.5"
                  style={{ borderRadius: 8, backgroundColor: "#f6f5f4" }}
                >
                  <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(0,0,0,0.95)", lineHeight: 1.2 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "#a39e98", marginTop: 2 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="px-6 mt-3">
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 400, color: "rgba(0,0,0,0.95)", lineHeight: 1.6 }}>
                {profile.bio}
              </p>
            </div>
          </div>
        )}

        {/* Links row */}
        <div className="flex justify-center gap-1.5 px-6 mt-3">
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1.5 transition-colors"
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              backgroundColor: "#f6f5f4",
              fontSize: 13,
              fontWeight: 500,
              color: "#615d59",
            }}
          >
            <ExternalLink className="h-3 w-3" />
            {t("profile.email")}
          </a>
          {(() => {
            const linkedinHref = sanitizeLinkHref(profile.linkedinUrl);
            return linkedinHref ? (
              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors"
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  backgroundColor: "#f6f5f4",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#615d59",
                }}
              >
                <ExternalLink className="h-3 w-3" />
                LinkedIn
              </a>
            ) : null;
          })()}
          {(() => {
            const portfolioHref = sanitizeLinkHref(profile.portfolioUrl);
            return portfolioHref ? (
              <a
                href={portfolioHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors"
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  backgroundColor: "#f6f5f4",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#615d59",
                }}
              >
                <ExternalLink className="h-3 w-3" />
                {t("profile.portfolio")}
              </a>
            ) : null;
          })()}
        </div>

        {/* Ratings section */}
        <div className="px-6 mt-4 pb-5">
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: 12, fontWeight: 600, color: "#a39e98", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t("profile.rating")}
              </p>
              {canRate && !showRating && (
                <button
                  style={{ fontSize: 12, fontWeight: 500, color: "#0075de" }}
                  onClick={() => setShowRating(true)}
                >
                  {t("profile.leaveRating")}
                </button>
              )}
            </div>

            {/* Rating input */}
            {showRating && (
              <div
                className="mb-3 overflow-hidden"
                style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }}
              >
                <div className="flex items-center justify-between px-3 py-2.5" style={{ backgroundColor: "#f6f5f4" }}>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setRatingScore(n)} className="p-0.5 transition-transform hover:scale-110">
                        <Star className={`h-4 w-4 transition-colors ${n <= ratingScore ? "fill-amber-400 text-amber-400" : "text-[#a39e98]/30"}`} />
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: "#a39e98" }}>{ratingScore}{t("profile.ratingScore")}</span>
                </div>
                <div className="p-2.5">
                  <Input
                    placeholder={t("profile.oneLineReview")}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitRating(); }}
                    className="h-8 text-[13px] bg-white border-[rgba(0,0,0,0.08)]"
                    autoFocus
                  />
                  <div className="flex gap-1.5 mt-2">
                    <Button
                      size="sm"
                      className="text-[12px] h-7 px-3"
                      style={{ backgroundColor: "rgba(0,0,0,0.95)", color: "#fff", borderRadius: 4 }}
                      disabled={!ratingComment.trim()}
                      onClick={handleSubmitRating}
                    >
                      {t("profile.submit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[12px] h-7"
                      style={{ color: "#a39e98" }}
                      onClick={() => setShowRating(false)}
                    >
                      {t("profile.cancel")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Rating list */}
            {profile.ratings.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-auto">
                {profile.ratings.slice().reverse().map((r, i) => (
                  <div key={i} className="px-3 py-2" style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-2.5 w-2.5 ${n <= r.score ? "fill-amber-400 text-amber-400" : "text-[#a39e98]/20"}`} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: "#a39e98" }}>{r.from}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#615d59", lineHeight: 1.5 }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#a39e98" }}>{t("profile.noRating")}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
