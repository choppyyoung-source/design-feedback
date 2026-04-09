"use client";

import { useState, useEffect } from "react";
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
import { Star, ExternalLink, Pencil, MessageCircle, CheckCircle2, FolderOpen, Banknote, Loader2 } from "lucide-react";
import {
  type UserProfile,
  type DesignerSpecialty,
  saveProfile,
  getProfile,
  addRating,
  SPECIALTY_LABELS,
} from "@/lib/profiles";
import { getEmoji } from "@/lib/avatar";
import { useT } from "@/lib/i18n";

// ── Design tokens (Notion style) ──
const CARD = "bg-white border border-[rgba(0,0,0,0.1)]";
const SECTION_TITLE = "text-[13px] font-semibold text-[#a39e98] uppercase tracking-wider";
const BODY_TEXT = "text-sm leading-relaxed text-[rgba(0,0,0,0.95)]";
const CAPTION = "text-[13px] text-[#a39e98]";
const DIVIDER = "border-b border-[rgba(0,0,0,0.08)]";
const INNER_BG = "bg-[#f6f5f4]";

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
  const t = useT();
  const isOwn = email === currentUserEmail;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getProfile(email).then((p) => {
      setProfile(p);
      if (p) {
        setName(p.name);
        setSpecialty(p.specialty);
        setBio(p.bio);
        setIsPrivate(p.isPrivate ?? false);
        setExperience(p.experience);
        setLinkedinUrl(p.linkedinUrl ?? "");
        setPortfolioUrl(p.portfolioUrl ?? "");
      } else if (isOwn) {
        setEditing(true);
      }
    });
  }, [email, isOwn]);

  const sessionName = typeof window !== "undefined"
    ? (() => {
        try {
          // Try Supabase session first, fall back to legacy localStorage
          const sbKey = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
          if (sbKey) {
            const sb = JSON.parse(localStorage.getItem(sbKey) || "{}");
            return sb?.user?.user_metadata?.full_name ?? sb?.user?.email?.split("@")[0] ?? "";
          }
          return JSON.parse(localStorage.getItem("dr_session") || "{}").name;
        } catch { return ""; }
      })()
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

  const handleSave = async () => {
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
    await saveProfile(updated);
    setProfile(updated);
    setEditing(false);
  };

  const handleSubmitRating = async () => {
    if (!currentUserEmail || !ratingComment.trim()) return;
    await addRating(email, currentUserEmail, ratingScore, ratingComment.trim());
    const updated = await getProfile(email);
    setProfile(updated);
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
        <p className="text-[13px] text-[#615d59]">{t("profile.notRegistered")}</p>
      </div>
    );
  }

  // Own profile loading (useEffect hasn't set editing=true yet)
  if (!profile && isOwn && !editing) {
    return null;
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Header */}
        <div className={`p-5 rounded-md ${CARD}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-md bg-[#f6f5f4] flex items-center justify-center text-2xl flex-shrink-0">
              {getEmoji(email)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold truncate">{name || t("profile.setup")}</h2>
              <p className="text-sm text-[#a39e98]">{email}</p>
            </div>
            {profile && (
              <Button variant="ghost" size="sm" className="text-sm h-8 text-[#615d59]" onClick={() => setEditing(false)}>
                {t("profile.cancel")}
              </Button>
            )}
          </div>
        </div>

        {/* Basic info */}
        <div className={`p-5 space-y-3.5 rounded-md ${CARD}`}>
          <p className={SECTION_TITLE}>{t("profile.basicInfo")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#615d59] block">{t("profile.nameLabel")}</label>
              <Input placeholder={t("profile.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} className="h-9 bg-white text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#615d59] block">{t("profile.specialty")}</label>
              <Select value={specialty} onValueChange={(v) => setSpecialty(v as DesignerSpecialty)}>
                <SelectTrigger className="!h-9 !min-h-[2.25rem] w-full bg-white text-[13px]">
                  <SelectValue placeholder={t("profile.specialtyPlaceholder")} />
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
            <label className="text-sm font-medium text-[#615d59] block">{t("profile.bio")}</label>
            <Input
              placeholder={t("profile.bioPlaceholder")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="h-9 bg-white text-[13px]"
            />
          </div>
        </div>

        {/* Experience + Links combined */}
        <div className={`p-5 space-y-4 rounded-md ${CARD}`}>
          <div className="space-y-2">
            <p className={SECTION_TITLE}>{t("profile.experience")}</p>
            <Textarea
              placeholder={t("profile.experiencePlaceholder")}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="min-h-[80px] resize-none bg-white text-[13px]"
            />
          </div>
          <div className={`pt-4 ${DIVIDER}`} />
          <div className="space-y-2">
            <p className={SECTION_TITLE}>{t("profile.links")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="LinkedIn URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="h-9 bg-white text-[13px]" />
              <Input placeholder={t("profile.portfolioUrl")} value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="h-9 bg-white text-[13px]" />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className={`px-5 py-3.5 flex items-center justify-between rounded-md ${CARD}`}>
          <div>
            <p className="text-[13px] font-medium">{t("profile.privateToggle")}</p>
            <p className="text-[13px] text-[#a39e98]">{t("profile.privateDesc")}</p>
          </div>
          <button
            className={`relative w-10 h-6 rounded-full transition-colors ${isPrivate ? "bg-[rgba(0,0,0,0.95)]" : "bg-[#f6f5f4]"}`}
            onClick={() => setIsPrivate(!isPrivate)}
            type="button"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-4" : ""}`} />
          </button>
        </div>

        <Button onClick={handleSave} className="w-full h-10 rounded-md bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90 text-background font-semibold">
          {t("profile.save")}
        </Button>
      </div>
    );
  }

  // ── View mode ──
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Profile card */}
        <div className={`p-6 overflow-hidden relative rounded-md ${CARD}`}>
          {/* Gradient banner */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/12 via-primary/4 to-transparent" />

          <div className="relative">
            {/* Edit button */}
            {isOwn && (
              <div className="absolute top-0 right-0">
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#615d59] hover:text-foreground hover:bg-[#f6f5f4] transition-colors"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  {t("profile.edit")}
                </button>
              </div>
            )}

            {/* Avatar */}
            <div className="flex justify-center mb-3 pt-2">
              <div className="w-16 h-16 rounded-md bg-white shadow-sm border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-3xl">
                {getEmoji(email)}
              </div>
            </div>

            {/* Name + tag */}
            <div className="text-center">
              <h2 className="text-lg font-bold">{profile!.name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="text-sm px-2.5 py-0.5 rounded-full bg-[#f2f9ff] text-primary font-medium">
                  {SPECIALTY_LABELS[profile!.specialty]}
                </span>
                {avgRating !== null && (
                  <span className="flex items-center gap-1 text-sm text-[#615d59]">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} ({profile!.ratings.length})
                  </span>
                )}
              </div>
            </div>

            {/* Contribution stats — show if user has any activity (gave feedback OR has projects) */}
            {contribution &&
              (contribution.totalComments > 0 || contribution.projectCount > 0) && (
                <ContributionTabs contribution={contribution} />
              )}

            {/* Links row */}
            <div className="flex justify-center gap-1.5 mt-4">
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f6f5f4] text-sm font-medium text-[#615d59] hover:bg-[#f6f5f4] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {t("profile.email")}
              </a>
              {profile!.linkedinUrl && (
                <a
                  href={profile!.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f6f5f4] text-sm font-medium text-[#615d59] hover:bg-[#f6f5f4] transition-colors"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f6f5f4] text-sm font-medium text-[#615d59] hover:bg-[#f6f5f4] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t("profile.portfolio")}
                </a>
              )}
            </div>

            {/* Payout settings — own profile only */}
            {isOwn && (
              <PayoutSettings profile={profile!} onUpdate={() => { getProfile(email).then(setProfile); }} />
            )}
          </div>
        </div>

      {/* Detail card */}
        <div className={`p-5 rounded-md ${CARD}`}>

          {/* Bio */}
          {profile!.bio && (
            <div className={`mb-4 pb-4 ${DIVIDER}`}>
              <p className={`${SECTION_TITLE} mb-1.5`}>{t("profile.introduction")}</p>
              <p className={BODY_TEXT}>{profile!.bio}</p>
            </div>
          )}

          {/* Experience */}
          {profile!.experience && (
            <div className={`mb-4 pb-4 ${DIVIDER}`}>
              <p className={`${SECTION_TITLE} mb-1.5`}>{t("profile.experience")}</p>
              <p className={`${BODY_TEXT} whitespace-pre-line`}>{profile!.experience}</p>
            </div>
          )}

          {/* Participated reviews */}
          {participatedReviews.length > 0 && (
            <div className={`mb-4 pb-4 ${DIVIDER}`}>
              <p className={`${SECTION_TITLE} mb-2`}>{t("profile.participatedReviews")}</p>
              <div className="space-y-1">
                {participatedReviews.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${INNER_BG} text-[13px]`}
                  >
                    <span className="font-medium text-[rgba(0,0,0,0.95)]">{r.name}</span>
                    <span className={CAPTION}>{r.commentCount}{t("dashboard.feedbackCount")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={SECTION_TITLE}>{t("profile.rating")}</p>
              {currentUserEmail && currentUserEmail !== email && !showRating && (
                <button
                  className="text-[13px] font-medium text-primary/70 hover:text-primary transition-colors"
                  onClick={() => setShowRating(true)}
                >
                  {t("profile.leaveRating")}
                </button>
              )}
            </div>

            {/* Rating input */}
            {showRating && (
              <div className="mb-3 rounded-md border border-[rgba(0,0,0,0.08)] overflow-hidden">
                {/* Star row */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#f6f5f4]">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setRatingScore(n)} className="p-0.5 transition-transform hover:scale-110">
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            n <= ratingScore
                              ? "fill-amber-400 text-amber-400"
                              : "text-[#a39e98]/30 hover:text-[#a39e98]"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] text-[#a39e98]">{ratingScore}{t("profile.ratingScore")}</span>
                </div>
                {/* Input + actions */}
                <div className="p-3">
                  <Input
                    placeholder={t("profile.ratingPlaceholder")}
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
                      className="text-sm h-8 px-4 bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.95)]/90 text-background"
                      disabled={!ratingComment.trim()}
                      onClick={handleSubmitRating}
                    >
                      {t("profile.submit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sm h-8 text-[#a39e98]"
                      onClick={() => setShowRating(false)}
                    >
                      {t("profile.cancel")}
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
                    <div key={i} className="px-3 py-2.5 rounded-md border border-[rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`h-3 w-3 ${n <= r.score ? "fill-amber-400 text-amber-400" : "text-[#a39e98]/20"}`} />
                          ))}
                        </div>
                        <span className="text-[13px] text-[#a39e98]">{r.from}</span>
                      </div>
                      <p className="text-[13px] text-[#615d59] leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className={`text-sm ${CAPTION}`}>{t("profile.noRating")}</p>
            )}
          </div>
        </div>
    </div>
  );
}

// ── Severity styles for feedback items ──
const FEEDBACK_SEVERITY: Record<string, { bg: string; text: string; dot: string; labelKey: string }> = {
  "must-fix": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", labelKey: "severity.mustFix" },
  "should-fix": { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", labelKey: "severity.shouldFix" },
  suggestion: { bg: "bg-blue-50", text: "text-blue-600", dot: "bg-blue-500", labelKey: "severity.suggestion" },
  praise: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500", labelKey: "severity.praise" },
};

type ContributionTab = "feedback" | "applied" | "projects";

function ContributionTabs({ contribution }: { contribution: ContributionStats }) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<ContributionTab | null>(null);

  const tabs: { key: ContributionTab; label: string; count: number; icon: typeof MessageCircle }[] = [
    { key: "feedback", label: t("profile.totalFeedback"), count: contribution.totalComments, icon: MessageCircle },
    { key: "applied", label: t("profile.adopted"), count: contribution.appliedComments, icon: CheckCircle2 },
    { key: "projects", label: t("profile.participatedProjects"), count: contribution.projectCount, icon: FolderOpen },
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
              className={`text-center px-3 py-2.5 rounded-md transition-all ${
                isActive
                  ? "bg-[#f6f5f4] ring-1 ring-border/70"
                  : "bg-[#f6f5f4] hover:bg-[#f6f5f4]"
              }`}
              onClick={() => setActiveTab(isActive ? null : tab.key)}
            >
              <p className="text-lg font-bold text-foreground">{tab.count}</p>
              <p className={`text-[13px] mt-0.5 ${isActive ? "text-[#615d59]" : "text-[#a39e98]"}`}>{tab.label}</p>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {activeTab && (
        <div className="mt-3 rounded-md bg-[#f6f5f4] border border-[rgba(0,0,0,0.08)] overflow-hidden">
          {activeTab === "feedback" && (
            feedbackItems.length > 0 ? (
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {feedbackItems.map((item) => (
                  <FeedbackRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#a39e98] text-center py-6">{t("profile.noFeedback")}</p>
            )
          )}

          {activeTab === "applied" && (
            appliedItems.length > 0 ? (
              <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                {appliedItems.map((item) => (
                  <FeedbackRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#a39e98] text-center py-6">{t("profile.noAdoptedFeedback")}</p>
            )
          )}

          {activeTab === "projects" && (
            (feedbackProjects.length > 0 || requestedProjects.length > 0) ? (
              <div>
                {/* Projects I gave feedback on */}
                {feedbackProjects.length > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-[#a39e98] uppercase tracking-wider px-4 pt-3 pb-1.5">{t("profile.feedbackGivenProjects")}</p>
                    <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                      {feedbackProjects.map((p) => (
                        <ProjectRow key={p.id} project={p} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Projects I requested feedback for */}
                {requestedProjects.length > 0 && (
                  <div className={feedbackProjects.length > 0 ? "border-t border-[rgba(0,0,0,0.08)]" : ""}>
                    <p className="text-[13px] font-semibold text-[#a39e98] uppercase tracking-wider px-4 pt-3 pb-1.5">{t("profile.feedbackRequestedProjects")}</p>
                    <div className="divide-y divide-[rgba(0,0,0,0.06)]">
                      {requestedProjects.map((p) => (
                        <ProjectRow key={p.id} project={p} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#a39e98] text-center py-6">{t("profile.noParticipatedProjects")}</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: ParticipatedProject }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#f6f5f4] transition-colors">
      <div className="w-8 h-8 rounded-lg bg-[#f6f5f4] overflow-hidden flex-shrink-0">
        {project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.imageUrl} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-3.5 w-3.5 text-[#a39e98]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[rgba(0,0,0,0.95)] truncate">{project.name}</p>
      </div>
      <span className="text-[13px] text-[#a39e98] flex-shrink-0">{project.feedbackCount}{t("dashboard.feedbackCount")}</span>
    </div>
  );
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const t = useT();
  const style = FEEDBACK_SEVERITY[item.severity] ?? FEEDBACK_SEVERITY.suggestion;

  return (
    <div className="px-4 py-3 hover:bg-[#f6f5f4] transition-colors">
      <p className="text-[13px] leading-relaxed text-[rgba(0,0,0,0.95)] mb-1.5">{item.comment}</p>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] font-medium ${style.bg} ${style.text}`}>
          <span className={`w-1 h-1 rounded-full ${style.dot}`} />
          {t(style.labelKey)}
        </span>
        {item.isApplied && (
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[#a39e98]">
            <CheckCircle2 className="h-2.5 w-2.5" />
            {t("status.completedAlt")}
          </span>
        )}
        <span className="text-[13px] text-[#a39e98] ml-auto">{item.projectName}</span>
      </div>
    </div>
  );
}

function PayoutSettings({ profile, onUpdate }: { profile: UserProfile; onUpdate: () => void }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<"paypal" | "bank">(profile.payoutMethod ?? "paypal");
  const [paypalEmail, setPaypalEmail] = useState(profile.paypalEmail ?? "");
  const [bankInfo, setBankInfo] = useState(profile.bankInfo ?? "");

  const hasPayoutInfo = !!profile.payoutMethod && (!!profile.paypalEmail || !!profile.bankInfo);

  const handleSave = async () => {
    const updated = {
      ...profile,
      payoutMethod: method,
      paypalEmail: method === "paypal" ? paypalEmail.trim() : profile.paypalEmail,
      bankInfo: method === "bank" ? bankInfo.trim() : profile.bankInfo,
    };
    await saveProfile(updated);
    onUpdate();
    setEditing(false);
  };

  // Connected state
  if (hasPayoutInfo && !editing) {
    return (
      <div className="mt-4">
        <div className={`px-4 py-3 rounded-md ${CARD} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">{t("payout.connected")}</p>
              <p className="text-[12px] text-[#a39e98]">
                {profile.payoutMethod === "paypal"
                  ? `PayPal · ${profile.paypalEmail}`
                  : `${t("payout.bankTransfer")} · ${profile.bankInfo}`}
              </p>
            </div>
          </div>
          <button
            className="text-[12px] font-medium text-[#0075de] hover:underline"
            onClick={() => setEditing(true)}
          >
            {t("profile.edit")}
          </button>
        </div>
      </div>
    );
  }

  // Edit / Setup state
  return (
    <div className="mt-4">
      <div className={`p-4 rounded-md ${CARD} space-y-3`}>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">
            <Banknote className="h-3.5 w-3.5 inline mr-1.5" />
            {t("payout.title")}
          </p>
          {hasPayoutInfo && (
            <button className="text-[12px] text-[#a39e98]" onClick={() => setEditing(false)}>
              {t("profile.cancel")}
            </button>
          )}
        </div>
        <p className="text-[12px] text-[#615d59] leading-relaxed">{t("payout.desc")}</p>

        {/* Method toggle */}
        <div className="flex gap-1.5">
          <button
            className={`flex-1 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
              method === "paypal"
                ? "bg-[#f2f9ff] text-[#097fe8] ring-1 ring-[#097fe8]/20"
                : "bg-[#f6f5f4] text-[#615d59]"
            }`}
            onClick={() => setMethod("paypal")}
          >
            PayPal
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
              method === "bank"
                ? "bg-[#f2f9ff] text-[#097fe8] ring-1 ring-[#097fe8]/20"
                : "bg-[#f6f5f4] text-[#615d59]"
            }`}
            onClick={() => setMethod("bank")}
          >
            {t("payout.bankTransfer")}
          </button>
        </div>

        {/* Input */}
        {method === "paypal" ? (
          <Input
            placeholder={t("payout.paypalPlaceholder")}
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            className="h-9 text-[13px] bg-white"
          />
        ) : (
          <Input
            placeholder={t("payout.bankPlaceholder")}
            value={bankInfo}
            onChange={(e) => setBankInfo(e.target.value)}
            className="h-9 text-[13px] bg-white"
          />
        )}

        <Button
          size="sm"
          className="w-full h-9 text-[13px] font-semibold bg-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.85)] text-white"
          disabled={method === "paypal" ? !paypalEmail.trim() : !bankInfo.trim()}
          onClick={handleSave}
        >
          {t("payout.save")}
        </Button>
      </div>
    </div>
  );
}

function formatRelativeDate(iso: string, t: (key: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("time.justNow");
  if (diffMin < 60) return t("time.minutesAgo").replace("{n}", String(diffMin));
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("time.hoursAgo").replace("{n}", String(diffHr));
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t("time.daysAgo").replace("{n}", String(diffDay));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
