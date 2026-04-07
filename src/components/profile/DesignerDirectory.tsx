"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Star, Search, ArrowLeft } from "lucide-react";
import {
  type UserProfile,
  getAllProfiles,
  SPECIALTY_LABELS,
} from "@/lib/profiles";
import { getEmoji } from "@/lib/avatar";

interface DesignerDirectoryProps {
  onSelectProfile: (email: string) => void;
  onBack?: () => void;
  currentUserEmail?: string;
}

export function DesignerDirectory({
  onSelectProfile,
  onBack,
  currentUserEmail,
}: DesignerDirectoryProps) {
  const [profiles] = useState<UserProfile[]>(() =>
    typeof window !== "undefined" ? getAllProfiles() : []
  );
  const [search, setSearch] = useState("");

  const filtered = profiles
    .filter((p) => !p.isPrivate)
    .filter(
      (p) =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.bio.toLowerCase().includes(search.toLowerCase()) ||
        SPECIALTY_LABELS[p.specialty].includes(search)
    );

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-1.5">
        {onBack && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors flex-shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="이름, 이메일, 직군으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-white border-border/70"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div>
          <div className="p-14 text-center bg-card border border-border/70 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">🔍</span>
            </div>
            <p className="text-sm font-medium mb-1">
              {search ? "검색 결과가 없어요" : "아직 등록된 디자이너가 없어요"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search ? "다른 키워드로 검색해보세요" : "첫 번째 디자이너가 되어보세요"}
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
              <div key={profile.email}>
                <div
                  className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border border-border/70 bg-card overflow-hidden rounded-2xl"
                  onClick={() => onSelectProfile(profile.email)}
                >
                  {/* Top: Avatar + Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-lg flex-shrink-0">
                      {getEmoji(profile.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold truncate">
                          {profile.name}
                        </p>
                        {isMe && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                            나
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-primary/60 font-medium">
                        {SPECIALTY_LABELS[profile.specialty]}
                      </p>
                    </div>
                    {/* Rating inline */}
                    {avgRating !== null ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-semibold">{avgRating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground/50">({profile.ratings.length})</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">후기 없음</span>
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-[12px] text-muted-foreground/60 line-clamp-2 mt-2.5 leading-relaxed">
                      {profile.bio}
                    </p>
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
