"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, ExternalLink, Pencil, Save, X } from "lucide-react";
import {
  type UserProfile,
  type DesignerSpecialty,
  saveProfile,
  getProfile,
  addRating,
  SPECIALTY_LABELS,
} from "@/lib/profiles";

interface ProfileSectionProps {
  email: string;
  currentUserEmail?: string;
  participatedReviews?: { id: string; name: string; commentCount: number }[];
}

export function ProfileSection({
  email,
  currentUserEmail,
  participatedReviews = [],
}: ProfileSectionProps) {
  const isOwn = email === currentUserEmail;
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? getProfile(email) : null
  );
  const [editing, setEditing] = useState(!profile && isOwn);

  // Edit form state - use session name as default
  const sessionName = typeof window !== "undefined"
    ? (() => { try { return JSON.parse(localStorage.getItem("dr_session") || "{}").name; } catch { return ""; } })()
    : "";
  const [name, setName] = useState(profile?.name ?? sessionName ?? "");
  const [specialty, setSpecialty] = useState<DesignerSpecialty>(
    profile?.specialty ?? "ui-ux"
  );
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);
  const [experience, setExperience] = useState(profile?.experience ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? "");

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const handleSave = () => {
    const updated: UserProfile = {
      email,
      name: name.trim() || email,
      specialty,
      bio: bio.trim(),
      experience: experience.trim(),
      linkedinUrl: linkedinUrl.trim() || undefined,
      portfolioUrl: portfolioUrl.trim() || undefined,
      isPrivate,
      ratings: profile?.ratings ?? [],
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    };
    saveProfile(updated);
    setProfile(updated);
    setEditing(false);
  };

  const handleSubmitRating = () => {
    if (!currentUserEmail || !ratingComment.trim()) return;
    addRating(email, currentUserEmail, ratingScore, ratingComment.trim());
    setProfile(getProfile(email));
    setRatingComment("");
    setShowRating(false);
  };

  const avgRating =
    profile && profile.ratings.length > 0
      ? profile.ratings.reduce((s, r) => s + r.score, 0) /
        profile.ratings.length
      : null;

  // No profile yet
  if (!profile && !isOwn) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">아직 프로필이 등록되지 않았어요</p>
      </div>
    );
  }

  // Edit mode
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-2xl font-bold">
            {(name || email)[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{name || "프로필 설정"}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          {profile && (
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              취소
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Basic info card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">기본 정보</h3>
            <div className="grid grid-cols-[1fr_1fr] gap-4">
              <div className="space-y-2.5">
                <label className="text-sm font-medium block">이름</label>
                <Input
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-sm font-medium block">직군</label>
                <Select
                  value={specialty}
                  onValueChange={(v) => setSpecialty(v as DesignerSpecialty)}
                >
                  <SelectTrigger className="!h-11 !min-h-[2.75rem] w-full">
                    <SelectValue placeholder="직군 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPECIALTY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2.5">
              <label className="text-sm font-medium block">한줄 소개</label>
              <Input
                placeholder="예: 사용자 중심의 제품을 만드는 디자이너입니다"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="h-11"
              />
            </div>
          </Card>

          {/* Experience card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">경력 및 경험</h3>
            <Textarea className="min-h-[120px] resize-none"
              placeholder="어떤 회사에서 어떤 일을 해왔는지 적어주세요&#10;&#10;예:&#10;- 토스 | 프로덕트 디자이너 (2022-현재)&#10;- 네이버 | UI/UX 인턴 (2021)"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </Card>

          {/* Links card */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">링크</h3>
            <div className="grid grid-cols-[1fr_1fr] gap-4">
              <div className="space-y-2.5">
                <label className="text-sm font-medium block">LinkedIn</label>
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-sm font-medium block">포트폴리오</label>
                <Input
                  placeholder="https://..."
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30">
            <div>
              <p className="text-sm font-medium">프로필 비공개</p>
              <p className="text-xs text-muted-foreground">다른 사람의 &apos;디자이너 찾기&apos;에 노출되지 않아요</p>
            </div>
            <button
              className={`relative w-10 h-6 rounded-full transition-colors ${isPrivate ? "bg-primary" : "bg-muted"}`}
              onClick={() => setIsPrivate(!isPrivate)}
              type="button"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : ""}`} />
            </button>
          </div>

          <Button onClick={handleSave} size="lg" className="w-full">
            프로필 저장
          </Button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile card */}
      <Card className="p-6 overflow-hidden relative">
        {/* Gradient banner */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />

        <div className="relative">
          {/* Header row */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-18 h-18 rounded-2xl bg-white shadow-sm border text-primary flex items-center justify-center text-3xl font-bold flex-shrink-0"
              style={{ width: 72, height: 72 }}
            >
              {(profile!.name || email)[0].toUpperCase()}
            </div>
            <div className="flex-1 pt-1">
              <h2 className="text-xl font-bold">{profile!.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {SPECIALTY_LABELS[profile!.specialty]}
                </span>
                {avgRating !== null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} ({profile!.ratings.length})
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{email}</p>
            </div>
            {isOwn && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                편집
              </Button>
            )}
          </div>

          {/* Bio */}
          {profile!.bio && (
            <p className="text-sm leading-relaxed text-foreground/80">{profile!.bio}</p>
          )}

          {/* Links */}
          {(profile!.linkedinUrl || profile!.portfolioUrl) && (
            <div className="flex gap-2 mt-4">
              {profile!.linkedinUrl && (
                <a
                  href={profile!.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  LinkedIn
                </a>
              )}
              {profile!.portfolioUrl && (
                <a
                  href={profile!.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  포트폴리오
                </a>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Experience card */}
      {profile!.experience && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">경력 및 경험</h3>
          <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
            {profile!.experience}
          </p>
        </Card>
      )}

      {/* Participated reviews */}
      {participatedReviews.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">참여한 리뷰</h3>
          <div className="space-y-2">
            {participatedReviews.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 text-sm"
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.commentCount}개 코멘트
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ratings section */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">리뷰 & 평점</h3>
          {currentUserEmail && currentUserEmail !== email && !showRating && (
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
          <Card className="p-3 mb-3">
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRatingScore(n)} className="p-0.5">
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
              placeholder="한줄 리뷰를 남겨주세요..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitRating();
              }}
              className="h-8 text-sm mb-2"
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
          </Card>
        )}

        {/* Rating list */}
        {profile!.ratings.length > 0 ? (
          <div className="space-y-2">
            {profile!.ratings
              .slice()
              .reverse()
              .map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{r.score}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{r.from}</span>
                    <p className="text-foreground/70">{r.comment}</p>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">아직 리뷰가 없어요</p>
        )}
      </Card>
    </div>
  );
}
