"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Star } from "lucide-react";
import { type UserProfile, getProfile, addRating, SPECIALTY_LABELS } from "@/lib/profiles";

interface ProfileViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  currentUserEmail?: string;
}

export function ProfileViewModal({
  open,
  onOpenChange,
  email,
  currentUserEmail,
}: ProfileViewModalProps) {
  const profile = typeof window !== "undefined" ? getProfile(email) : null;
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showRating, setShowRating] = useState(false);

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{email}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            아직 프로필이 등록되지 않았어요.
          </p>
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

  const handleSubmitRating = () => {
    if (!currentUserEmail || !ratingComment.trim()) return;
    addRating(email, currentUserEmail, ratingScore, ratingComment.trim());
    setRatingComment("");
    setShowRating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {profile.name}
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {SPECIALTY_LABELS[profile.specialty]}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Email */}
          <p className="text-sm text-muted-foreground">{profile.email}</p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm leading-relaxed">{profile.bio}</p>
          )}

          {/* Portfolio */}
          {profile.portfolioUrl && (
            <a
              href={profile.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              포트폴리오
            </a>
          )}

          {/* Ratings summary */}
          <div className="flex items-center gap-2">
            {avgRating !== null && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({profile.ratings.length}개 리뷰)
                </span>
              </div>
            )}
            {canRate && !showRating && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowRating(true)}
              >
                평점 남기기
              </Button>
            )}
          </div>

          {/* Rating input */}
          {showRating && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRatingScore(n)}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        n <= ratingScore
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Input
                placeholder="한줄 리뷰..."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitRating();
                }}
                className="h-8 text-sm"
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="text-xs h-7"
                  disabled={!ratingComment.trim()}
                  onClick={handleSubmitRating}
                >
                  등록
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowRating(false)}
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          {/* Rating list */}
          {profile.ratings.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-auto">
              {profile.ratings
                .slice()
                .reverse()
                .map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs"
                  >
                    <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{r.score}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{r.from}</span>
                      <p className="text-foreground/70">{r.comment}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
