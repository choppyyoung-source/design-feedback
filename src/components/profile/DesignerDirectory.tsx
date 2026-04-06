"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, Search, MessageCircle } from "lucide-react";
import {
  type UserProfile,
  getAllProfiles,
  SPECIALTY_LABELS,
} from "@/lib/profiles";

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

  // Filter out profiles marked as private
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
      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 이메일, 직군으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <p className="text-muted-foreground text-sm">
            {search ? "검색 결과가 없어요" : "아직 등록된 디자이너가 없어요"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => {
            const avgRating =
              profile.ratings.length > 0
                ? profile.ratings.reduce((s, r) => s + r.score, 0) /
                  profile.ratings.length
                : null;

            return (
              <Card
                key={profile.email}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-all border-border/60"
                onClick={() => onSelectProfile(profile.email)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm border text-primary flex items-center justify-center text-base font-bold flex-shrink-0">
                      {(profile.name || profile.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-semibold truncate">
                        {profile.name}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {SPECIALTY_LABELS[profile.specialty]}
                      </span>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-xs text-foreground/60 mt-3 line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
                    {avgRating !== null ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">
                          {avgRating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({profile.ratings.length}개 후기)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        아직 후기 없음
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
