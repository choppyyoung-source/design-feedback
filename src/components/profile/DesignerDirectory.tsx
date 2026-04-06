"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";
import {
  type UserProfile,
  getAllProfiles,
  SPECIALTY_LABELS,
} from "@/lib/profiles";
import { getEmoji } from "@/lib/avatar";

interface DesignerDirectoryProps {
  onSelectProfile: (email: string) => void;
  currentUserEmail?: string;
}

export function DesignerDirectory({
  onSelectProfile,
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
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름, 이메일, 직군으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">🔍</span>
          </div>
          <p className="text-sm font-medium mb-1">
            {search ? "검색 결과가 없어요" : "아직 등록된 디자이너가 없어요"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search ? "다른 키워드로 검색해보세요" : "첫 번째 디자이너가 되어보세요"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((profile) => {
            const avgRating =
              profile.ratings.length > 0
                ? profile.ratings.reduce((s, r) => s + r.score, 0) /
                  profile.ratings.length
                : null;
            const isMe = profile.email === currentUserEmail;

            return (
              <Card
                key={profile.email}
                className="p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border-border/50"
                onClick={() => onSelectProfile(profile.email)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-xl">
                    {getEmoji(profile.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">
                        {profile.name}
                      </p>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                          나
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-primary font-medium">
                      {SPECIALTY_LABELS[profile.specialty]}
                    </p>
                  </div>
                </div>

                {profile.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {profile.bio}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
                  {avgRating !== null ? (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
                      ({profile.ratings.length})
                    </span>
                  ) : (
                    <span>후기 없음</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
