"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, ExternalLink, Pencil, MessageCircle, CheckCircle2, FolderOpen } from "lucide-react";
import {
  type UserProfile,
  type DesignerSpecialty,
  saveProfile,
  getProfile,
  addRating,
  SPECIALTY_LABELS,
} from "@/lib/profiles";
import { getEmoji } from "@/lib/avatar";

// ── Design tokens ──
const CARD = "bg-card border border-border/70";
const SECTION_TITLE = "text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider";
const BODY_TEXT = "text-sm leading-relaxed text-foreground/80";
const CAPTION = "text-[12px] text-muted-foreground/50";
const DIVIDER = "border-b border-border/40";
const INNER_BG = "bg-muted/30";

interface FeedbackItem {
  id: string;
  comment: string;
  severity: string;
  projectName: string;
  createdAt: string;
  isApplied: boolean;
}

interface ParticipatedProject {
  id: string;
  name: string;
  feedbackCount: number;
  imageUrl?: string;
}

interface ContributionStats {
  totalComments: number;
  appliedComments: number;
  projectCount: number;
  feedbackItems?: FeedbackItem[];
  feedbackProjects?: ParticipatedProject[];
  requestedProjects?: ParticipatedProject[];
  /** @deprecated use feedbackProjects + requestedProjects */
  participatedProjects?: ParticipatedProject[];
}

interface ProfileSectionProps {
  email: string;
  currentUserEmail?: string;
  participatedReviews?: { id: string; name: string; commentCount: number }[];
  contribution?: ContributionStats;
}

export function ProfileSection({
  email,
  currentUserEmail,
  participatedReviews = [],
  contribution,
}: ProfileSectionProps) {
  const isOwn = email === currentUserEmail;
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    typeof window !== "undefined" ? getProfile(email) : null
  );
  const [editing, setEditing] = useState(!profile && isOwn);

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
        <p className="text-[13px] text-muted-foreground/60">아직 프로필이 등록되지 않았어요</p>
      </div>
    );
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Header */}
        <div className={`p-5 rounded-2xl ${CARD}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center text-2xl flex-shrink-0">
              {getEmoji(email)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold truncate">{name || "프로필 설정"}</h2>
              <p className="text-[12px] text-muted-foreground/40">{email}</p>
            </div>
            {profile && (
              <Button variant="ghost" size="sm" className="text-[12px] h-8 text-muted-foreground/60" onClick={() => setEditing(false)}>
                취소
              </Button>
            )}
          </div>
        </div>

        {/* Basic info */}
        <div className={`p-5 space-y-3.5 rounded-2xl ${CARD}`}>
          <p className={SECTION_TITLE}>기본 정보</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground/60 block">이름</label>
              <Input placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} className="h-9 bg-white text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground/60 block">직군</label>
              <Select value={specialty} onValueChange={(v) => setSpecialty(v as DesignerSpecialty)}>
                <SelectTrigger className="!h-9 !min-h-[2.25rem] w-full bg-white text-[13px]">
                  <SelectValue placeholder="직군 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPECIALTY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground/60 block">한줄 소개</label>
            <Input
              placeholder="예: 사용자 중심의 제품을 만드는 디자이너입니다"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="h-9 bg-white text-[13px]"
            />
          </div>
        </div>

        {/* Experience + Links combined */}
        <div className={`p-5 space-y-4 rounded-2xl ${CARD}`}>
          <div className="space-y-2">
            <p className={SECTION_TITLE}>경력 및 경험</p>
            <Textarea
              placeholder={"예: 토스 프로덕트 디자이너 (2022-현재)"}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="min-h-[80px] resize-none bg-white text-[13px]"
            />
          </div>
          <div className={`pt-4 ${DIVIDER}`} />
          <div className="space-y-2">
            <p className={SECTION_TITLE}>링크</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="LinkedIn URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="h-9 bg-white text-[13px]" />
              <Input placeholder="포트폴리오 URL" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="h-9 bg-white text-[13px]" />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className={`px-5 py-3.5 flex items-center justify-between rounded-2xl ${CARD}`}>
          <div>
            <p className="text-[13px] font-medium">프로필 비공개</p>
            <p className="text-[11px] text-muted-foreground/40">디자이너 찾기에 노출되지 않아요</p>
          </div>
          <button
            className={`relative w-10 h-6 rounded-full transition-colors ${isPrivate ? "bg-foreground" : "bg-muted/60"}`}
            onClick={() => setIsPrivate(!isPrivate)}
            type="button"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : ""}`} />
          </button>
        </div>

        <Button onClick={handleSave} className="w-full h-10 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold">
          프로필 저장
        </Button>
      </div>
    );
  }

  // ── View mode ──
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Profile card */}
        <div className={`p-6 overflow-hidden relative rounded-2xl ${CARD}`}>
          {/* Gradient banner */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/12 via-primary/4 to-transparent" />

          <div className="relative">
            {/* Edit button */}
            {isOwn && (
              <div className="absolute top-0 right-0">
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  편집
                </button>
              </div>
            )}

            {/* Avatar */}
            <div className="flex justify-center mb-3 pt-2">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-border/40 flex items-center justify-center text-3xl">
                {getEmoji(email)}
              </div>
            </div>

            {/* Name + tag */}
            <div className="text-center">
              <h2 className="text-lg font-bold">{profile!.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-primary/8 text-primary font-medium">
                  {SPECIALTY_LABELS[profile!.specialty]}
                </span>
                {avgRating !== null && (
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground/60">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} ({profile!.ratings.length})
                  </span>
                )}
              </div>
            </div>

            {/* Contribution stats */}
            {contribution && contribution.totalComments > 0 && (
              <ContributionTabs contribution={contribution} />
            )}

            {/* Links row */}
            <div className="flex justify-center gap-1.5 mt-4">
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 text-[12px] font-medium text-foreground/60 hover:bg-muted/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                이메일
              </a>
              {profile!.linkedinUrl && (
                <a
                  href={profile!.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 text-[12px] font-medium text-foreground/60 hover:bg-muted/60 transition-colors"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 text-[12px] font-medium text-foreground/60 hover:bg-muted/60 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  포트폴리오
                </a>
              )}
            </div>
          </div>
        </div>

      {/* Detail card */}
        <div className={`p-5 rounded-2xl ${CARD}`}>

          {/* Bio */}
          {profile!.bio && (
            <div className={`mb-4 pb-4 ${DIVIDER}`}>
              <p className={`${SECTION_TITLE} mb-1.5`}>소개</p>
              <p className={BODY_TEXT}>{profile!.bio}</p>
            </div>
          )}

          {/* Experience */}
          {profile!.experience && (
            <div className={`mb-4 pb-4 ${DIVIDER}`}>
              <p className={`${SECTION_TITLE} mb-1.5`}>경력 및 경험</p>
              <p className={`${BODY_TEXT} whitespace-pre-line`}>{profile!.experience}</p>
            </div>
          )}

          {/* Participated reviews */}
          {participatedReviews.length > 0 && (
            <div className={`mb-4 pb-4 ${DIVIDER}`}>
              <p className={`${SECTION_TITLE} mb-2`}>참여한 리뷰</p>
              <div className="space-y-1">
                {participatedReviews.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${INNER_BG} text-[13px]`}
                  >
                    <span className="font-medium text-foreground/80">{r.name}</span>
                    <span className={CAPTION}>{r.commentCount}개 피드백</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={SECTION_TITLE}>평점</p>
              {currentUserEmail && currentUserEmail !== email && !showRating && (
                <button
                  className="text-[11px] font-medium text-primary/70 hover:text-primary transition-colors"
                  onClick={() => setShowRating(true)}
                >
                  평점 남기기
                </button>
              )}
            </div>

            {/* Rating input */}
            {showRating && (
              <div className="mb-3 rounded-xl border border-border/40 overflow-hidden">
                {/* Star row */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setRatingScore(n)} className="p-0.5 transition-transform hover:scale-110">
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            n <= ratingScore
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/15 hover:text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground/40">{ratingScore}점</span>
                </div>
                {/* Input + actions */}
                <div className="p-3">
                  <Input
                    placeholder="어떤 점이 좋았는지 한줄로 남겨주세요"
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitRating();
                    }}
                    className="h-9 text-[13px] bg-white"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2.5">
                    <Button
                      size="sm"
                      className="text-[12px] h-8 px-4 bg-foreground hover:bg-foreground/90 text-background"
                      disabled={!ratingComment.trim()}
                      onClick={handleSubmitRating}
                    >
                      등록
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[12px] h-8 text-muted-foreground/50"
                      onClick={() => setShowRating(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Rating list */}
            {profile!.ratings.length > 0 ? (
              <div className="space-y-1.5">
                {profile!.ratings
                  .slice()
                  .reverse()
                  .map((r, i) => (
                    <div key={i} className="px-3 py-2.5 rounded-xl border border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`h-3 w-3 ${n <= r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/10"}`} />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground/35">{r.from}</span>
                      </div>
                      <p className="text-[13px] text-foreground/70 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className={`text-[12px] ${CAPTION}`}>아직 평점이 없어요</p>
            )}
          </div>
        </div>
    </div>
  );
}

// ── Severity styles for feedback items ──
const FEEDBACK_SEVERITY: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", label: "필수 수정" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", label: "수정 권장" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", label: "제안" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", label: "좋아요" },
};

type ContributionTab = "feedback" | "applied" | "projects";

function ContributionTabs({ contribution }: { contribution: ContributionStats }) {
  const [activeTab, setActiveTab] = useState<ContributionTab | null>(null);

  const tabs: { key: ContributionTab; label: string; count: number; icon: typeof MessageCircle }[] = [
    { key: "feedback", label: "총 피드백", count: contribution.totalComments, icon: MessageCircle },
    { key: "applied", label: "채택됨", count: contribution.appliedComments, icon: CheckCircle2 },
    { key: "projects", label: "참여 프로젝트", count: contribution.projectCount, icon: FolderOpen },
  ];

  const feedbackItems = contribution.feedbackItems ?? [];
  const appliedItems = feedbackItems.filter((f) => f.isApplied);
  const feedbackProjects = contribution.feedbackProjects ?? contribution.participatedProjects ?? [];
  const requestedProjects = contribution.requestedProjects ?? [];

  return (
    <div className="mt-5">
      {/* Chip tabs */}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`text-center px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-muted/30 ring-1 ring-border/70"
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
              onClick={() => setActiveTab(isActive ? null : tab.key)}
            >
              <p className="text-lg font-bold text-foreground">{tab.count}</p>
              <p className={`text-[11px] mt-0.5 ${isActive ? "text-foreground/60" : "text-muted-foreground/50"}`}>{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {activeTab && (
        <div className="mt-3 rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
          {activeTab === "feedback" && (
            feedbackItems.length > 0 ? (
              <div className="divide-y divide-border/20">
                {feedbackItems.map((item) => (
                  <FeedbackRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground/50 text-center py-6">피드백이 없어요</p>
            )
          )}

          {activeTab === "applied" && (
            appliedItems.length > 0 ? (
              <div className="divide-y divide-border/20">
                {appliedItems.map((item) => (
                  <FeedbackRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground/50 text-center py-6">채택된 피드백이 없어요</p>
            )
          )}

          {activeTab === "projects" && (
            (feedbackProjects.length > 0 || requestedProjects.length > 0) ? (
              <div>
                {/* Projects I gave feedback on */}
                {feedbackProjects.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-4 pt-3 pb-1.5">피드백 남긴 프로젝트</p>
                    <div className="divide-y divide-border/20">
                      {feedbackProjects.map((p) => (
                        <ProjectRow key={p.id} project={p} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Projects I requested feedback for */}
                {requestedProjects.length > 0 && (
                  <div className={feedbackProjects.length > 0 ? "border-t border-border/30" : ""}>
                    <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-4 pt-3 pb-1.5">피드백 요청한 프로젝트</p>
                    <div className="divide-y divide-border/20">
                      {requestedProjects.map((p) => (
                        <ProjectRow key={p.id} project={p} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground/50 text-center py-6">참여한 프로젝트가 없어요</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: ParticipatedProject }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted/40 overflow-hidden flex-shrink-0">
        {project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.imageUrl} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground/80 truncate">{project.name}</p>
      </div>
      <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">{project.feedbackCount}개 피드백</span>
    </div>
  );
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const style = FEEDBACK_SEVERITY[item.severity] ?? FEEDBACK_SEVERITY.suggestion;

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <p className="text-[13px] leading-relaxed text-foreground/85 mb-1.5">{item.comment}</p>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
          <span className={`w-1 h-1 rounded-full ${style.dot}`} />
          {style.label}
        </span>
        {item.isApplied && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/40">
            <CheckCircle2 className="h-2.5 w-2.5" />
            채택됨
          </span>
        )}
        <span className="text-[11px] text-muted-foreground/40 ml-auto">{item.projectName}</span>
      </div>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
