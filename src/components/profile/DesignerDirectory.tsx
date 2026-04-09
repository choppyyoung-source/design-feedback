"use client";

import { useState, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, Search, ArrowLeft } from "lucide-react";
import {
  type UserProfile,
  getAllProfiles,
  getAllProfilesLocal,
  SPECIALTY_KEYS,
} from "@/lib/profiles";
import { getEmoji } from "@/lib/avatar";
import { useT } from "@/lib/i18n";

interface DesignerDirectoryProps {
  onSelectProfile: (email: string) => void;
  onRequestFeedback?: (designerEmail: string) => void;
  onBack?: () => void;
  currentUserEmail?: string;
}

export function DesignerDirectory({
  onSelectProfile,
  onRequestFeedback,
  onBack,
  currentUserEmail,
}: DesignerDirectoryProps) {
  const t = useT();
  // Seed from localStorage synchronously for instant paint
  const [profiles, setProfiles] = useState<UserProfile[]>(() => getAllProfilesLocal());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAllProfiles()
      .then((data) => {
        if (!cancelled) setProfiles(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = profiles
    .filter((p) => !p.isPrivate && p.email !== currentUserEmail)
    .filter(
      (p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.bio.toLowerCase().includes(search.toLowerCase()) ||
        t(SPECIALTY_KEYS[p.specialty]).toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-1.5">
        {onBack && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors flex-shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a39e98]" />
          <Input
            placeholder={t("directory.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-white border-[rgba(0,0,0,0.1)]"
          />
        </div>
      </div>

      {loading && profiles.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 border border-[rgba(0,0,0,0.1)] bg-card rounded-md animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#f6f5f4] flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 bg-[#f6f5f4] rounded w-24" />
                  <div className="h-3 bg-[#f6f5f4] rounded w-16" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 bg-[#f6f5f4] rounded w-full" />
                <div className="h-3 bg-[#f6f5f4] rounded w-3/4" />
              </div>
              <div className="h-8 bg-[#f6f5f4] rounded mt-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div>
          <div className="p-14 text-center bg-card border border-[rgba(0,0,0,0.1)] rounded-md">
            <div className="w-12 h-12 rounded-md bg-[#f6f5f4] flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">🔍</span>
            </div>
            <p className="text-sm font-medium mb-1">
              {search ? t("directory.noResults") : t("directory.noDesigners")}
            </p>
            <p className="text-xs text-[#615d59]">
              {search ? t("directory.tryOtherKeyword") : t("directory.beFirst")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((profile) => {
            const avgRating =
              profile.ratings.length > 0
                ? profile.ratings.reduce((s, r) => s + r.score, 0) /
                  profile.ratings.length
                : null;
            const isMe = profile.email === currentUserEmail;

            return (
              <div key={profile.email} className="flex">
                <div
                  className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border border-[rgba(0,0,0,0.1)] bg-card overflow-hidden rounded-md w-full flex flex-col"
                  onClick={() => onSelectProfile(profile.email)}
                >
                  {/* Top: Avatar + Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#f6f5f4] flex items-center justify-center text-lg flex-shrink-0">
                      {getEmoji(profile.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold truncate">
                          {profile.name}
                        </p>
                        {isMe && (
                          <span className="text-[13px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                            {t("review.me")}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-primary/60 font-medium">
                        {t(SPECIALTY_KEYS[profile.specialty])}
                      </p>
                    </div>
                    {/* Rating inline */}
                    {avgRating !== null ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[13px] font-semibold">{avgRating.toFixed(1)}</span>
                        <span className="text-[13px] text-[#a39e98]">({profile.ratings.length})</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[#a39e98] flex-shrink-0">{t("profile.noReview")}</span>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-[#615d59] line-clamp-2 mt-2.5 leading-relaxed flex-1">
                    {profile.bio || t("profile.noBioYet")}
                  </p>

                  {/* Request button */}
                  {!isMe && onRequestFeedback && (
                    <Button
                      size="sm"
                      className="w-full mt-3 h-8 text-sm bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90 text-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestFeedback(profile.email);
                      }}
                    >
                      {t("profile.requestFeedback")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
